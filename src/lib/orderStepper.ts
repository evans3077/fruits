import type { OrderSummaryDto } from '../types';

export type OrderStepperStageKey = 'pending' | 'packing' | 'in_transit' | 'delivered';

export interface OrderStepperStage {
  key: OrderStepperStageKey;
  label: string;
  caption: string;
  state: 'completed' | 'current' | 'upcoming' | 'halted';
  timestamp: string | null;
}

export interface OrderStepperModel {
  stages: OrderStepperStage[];
  activeStageIndex: number;
  isHalted: boolean;
  haltedReason: string | null;
  progressPercent: number;
}

const STAGE_ORDER: OrderStepperStageKey[] = ['pending', 'packing', 'in_transit', 'delivered'];

function mapStatusToStageIndex(fulfilmentStatus: string): number {
  switch (fulfilmentStatus) {
    case 'received':
    case 'confirmed':
      return 0;
    case 'preparing':
      return 1;
    case 'out_for_delivery':
    case 'ready_for_collection':
      return 2;
    case 'delivered':
      return 3;
    default:
      return 0;
  }
}

function findStageTimestamp(
  order: OrderSummaryDto,
  matchingStatuses: string[],
  fallbackToCreatedAt = false
): string | null {
  const matched = [...(order.events ?? [])]
    .reverse()
    .find((ev) => matchingStatuses.includes(ev.toStatus));
  if (matched) return matched.createdAt;
  if (fallbackToCreatedAt) return order.createdAt;
  return null;
}

export function isOrderActiveForPolling(order: Pick<OrderSummaryDto, 'fulfilmentStatus' | 'paymentStatus'>): boolean {
  if (order.fulfilmentStatus === 'delivered' || order.fulfilmentStatus === 'cancelled') {
    return false;
  }
  if (order.paymentStatus === 'failed' || order.paymentStatus === 'cancelled') {
    return false;
  }
  return true;
}

export function hasActiveOrders(orders: Pick<OrderSummaryDto, 'fulfilmentStatus' | 'paymentStatus'>[]): boolean {
  return orders.some(isOrderActiveForPolling);
}

export function buildOrderStepperModel(order: OrderSummaryDto): OrderStepperModel {
  const isCollection = order.fulfilmentType === 'collection';
  const isCancelled =
    order.fulfilmentStatus === 'cancelled' || order.paymentStatus === 'cancelled';
  const isPaymentFailed = order.paymentStatus === 'failed' && !isCancelled;
  const isHalted = isCancelled || isPaymentFailed;

  const currentStageIndex = mapStatusToStageIndex(order.fulfilmentStatus);

  // Determine how far the order progressed before any cancellation/failure
  const lastNonCancelledEvent = [...(order.events ?? [])]
    .reverse()
    .find((ev) => ev.toStatus !== 'cancelled' && ev.toStatus !== 'failed');
  const reachedIndex = isHalted
    ? lastNonCancelledEvent
      ? mapStatusToStageIndex(lastNonCancelledEvent.toStatus)
      : 0
    : currentStageIndex;

  const latestFailureNote =
    order.transactions?.[0]?.failureReason ||
    [...(order.events ?? [])]
      .reverse()
      .find((ev) => ev.toStatus === 'cancelled' || ev.toStatus === 'failed')?.note ||
    null;

  const haltedReason = isCancelled
    ? latestFailureNote || 'Order was cancelled before completion.'
    : isPaymentFailed
      ? latestFailureNote || 'M-Pesa payment did not complete. Retry payment to resume.'
      : null;

  const stageDefinitions: Record<
    OrderStepperStageKey,
    { label: string; caption: string; timestamp: string | null }
  > = {
    pending: {
      label: 'Pending',
      caption:
        order.paymentStatus === 'pending_confirmation' ||
        order.paymentStatus === 'awaiting_payment'
          ? 'Awaiting confirmation'
          : 'Order confirmed',
      timestamp: findStageTimestamp(order, ['received', 'confirmed'], true),
    },
    packing: {
      label: 'Packing',
      caption: 'Cold-blending & sealing',
      timestamp: findStageTimestamp(order, ['preparing']),
    },
    in_transit: {
      label: 'In Transit',
      caption: isCollection ? 'Ready for pickup' : 'Rider en route',
      timestamp: findStageTimestamp(order, ['out_for_delivery', 'ready_for_collection']),
    },
    delivered: {
      label: 'Delivered',
      caption: isCollection ? 'Collected at hub' : 'Handed over',
      timestamp: findStageTimestamp(order, ['delivered']),
    },
  };

  const stages: OrderStepperStage[] = STAGE_ORDER.map((key, idx) => {
    const def = stageDefinitions[key];
    let state: OrderStepperStage['state'] = 'upcoming';

    if (isHalted) {
      if (idx < reachedIndex) {
        state = 'completed';
      } else if (idx === reachedIndex) {
        state = 'halted';
      } else {
        state = 'upcoming';
      }
    } else if (currentStageIndex === 3) {
      state = 'completed';
    } else if (idx < currentStageIndex) {
      state = 'completed';
    } else if (idx === currentStageIndex) {
      state = 'current';
    }

    return {
      key,
      label: def.label,
      caption: def.caption,
      state,
      timestamp: state === 'upcoming' ? null : def.timestamp,
    };
  });

  const progressPercent = isHalted
    ? Math.round((reachedIndex / (STAGE_ORDER.length - 1)) * 100)
    : Math.round((currentStageIndex / (STAGE_ORDER.length - 1)) * 100);

  return {
    stages,
    activeStageIndex: reachedIndex,
    isHalted,
    haltedReason,
    progressPercent,
  };
}
