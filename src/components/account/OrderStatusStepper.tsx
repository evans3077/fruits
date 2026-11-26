import React from 'react';
import { Check, Clock, PackageCheck, Store, Truck, X } from 'lucide-react';
import { buildOrderStepperModel, type OrderStepperStageKey } from '../../lib/orderStepper';
import { formatNairobiDateTime } from '../../lib/kenya';
import type { OrderSummaryDto } from '../../types';

interface OrderStatusStepperProps {
  order: OrderSummaryDto;
  compact?: boolean;
}

function StageIcon({
  stageKey,
  isCollection,
  state,
}: {
  stageKey: OrderStepperStageKey;
  isCollection: boolean;
  state: 'completed' | 'current' | 'upcoming' | 'halted';
}) {
  const iconClass = 'w-4 h-4';

  if (state === 'halted') {
    return <X className={iconClass} aria-hidden="true" />;
  }

  if (state === 'completed') {
    return <Check className={iconClass} aria-hidden="true" />;
  }

  switch (stageKey) {
    case 'pending':
      return <Clock className={iconClass} aria-hidden="true" />;
    case 'packing':
      return <PackageCheck className={iconClass} aria-hidden="true" />;
    case 'in_transit':
      return isCollection ? (
        <Store className={iconClass} aria-hidden="true" />
      ) : (
        <Truck className={iconClass} aria-hidden="true" />
      );
    case 'delivered':
      return <Check className={iconClass} aria-hidden="true" />;
  }
}

export const OrderStatusStepper: React.FC<OrderStatusStepperProps> = ({
  order,
  compact = false,
}) => {
  const model = buildOrderStepperModel(order);
  const isCollection = order.fulfilmentType === 'collection';

  return (
    <div
      className={`${
        compact ? 'px-5 sm:px-6 pb-5 pt-1' : 'p-4 sm:p-5 rounded-xl bg-white border border-zinc-200'
      } space-y-3`}
      aria-label={`Order ${order.orderRef} fulfilment progress`}
    >
      {/* Desktop & Tablet Horizontal Track */}
      <div className="hidden sm:block relative">
        <div
          className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 bg-zinc-200 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className={`h-full transition-all duration-300 motion-reduce:transition-none ${
              model.isHalted ? 'bg-red-400' : 'bg-zinc-900'
            }`}
            style={{ width: `${model.progressPercent}%` }}
          />
        </div>

        <ol className="relative grid grid-cols-4 gap-2">
          {model.stages.map((stage) => {
            const nodeClasses =
              stage.state === 'completed'
                ? 'bg-zinc-900 border-zinc-900 text-white'
                : stage.state === 'current'
                  ? 'bg-white border-zinc-900 text-zinc-950 ring-4 ring-zinc-900/10'
                  : stage.state === 'halted'
                    ? 'bg-red-50 border-red-600 text-red-700'
                    : 'bg-white border-zinc-300 text-zinc-400';

            const labelClasses =
              stage.state === 'upcoming'
                ? 'text-zinc-400'
                : stage.state === 'halted'
                  ? 'text-red-800'
                  : 'text-zinc-950';

            return (
              <li
                key={stage.key}
                className="flex flex-col items-center text-center"
                aria-current={stage.state === 'current' ? 'step' : undefined}
              >
                <span
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-300 motion-reduce:transition-none ${nodeClasses}`}
                >
                  <StageIcon
                    stageKey={stage.key}
                    isCollection={isCollection}
                    state={stage.state}
                  />
                </span>
                <span className={`mt-2 text-xs font-semibold tracking-tight ${labelClasses}`}>
                  {stage.label}
                </span>
                <span className="mt-0.5 text-[11px] text-zinc-500 leading-tight">
                  {stage.caption}
                </span>
                {stage.timestamp && (
                  <span className="mt-0.5 text-[10px] text-zinc-400 tabular-nums">
                    {formatNairobiDateTime(stage.timestamp)}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Mobile Vertical Timeline Track */}
      <ol className="sm:hidden space-y-2.5">
        {model.stages.map((stage, idx) => {
          const isLast = idx === model.stages.length - 1;
          const nodeClasses =
            stage.state === 'completed'
              ? 'bg-zinc-900 border-zinc-900 text-white'
              : stage.state === 'current'
                ? 'bg-white border-zinc-900 text-zinc-950 ring-2 ring-zinc-900/15'
                : stage.state === 'halted'
                  ? 'bg-red-50 border-red-600 text-red-700'
                  : 'bg-white border-zinc-300 text-zinc-400';

          return (
            <li
              key={stage.key}
              className="relative flex items-start gap-3"
              aria-current={stage.state === 'current' ? 'step' : undefined}
            >
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-3.5 top-7 bottom-[-10px] w-0.5 ${
                    stage.state === 'completed' ? 'bg-zinc-900' : 'bg-zinc-200'
                  }`}
                />
              )}
              <span
                className={`relative z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${nodeClasses}`}
              >
                <StageIcon
                  stageKey={stage.key}
                  isCollection={isCollection}
                  state={stage.state}
                />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      stage.state === 'upcoming'
                        ? 'text-zinc-400'
                        : stage.state === 'halted'
                          ? 'text-red-800'
                          : 'text-zinc-950'
                    }`}
                  >
                    {stage.label}
                  </span>
                  {stage.timestamp && (
                    <span className="text-[10px] text-zinc-400 tabular-nums shrink-0">
                      {formatNairobiDateTime(stage.timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">{stage.caption}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {model.isHalted && model.haltedReason && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
          {model.haltedReason}
        </div>
      )}
    </div>
  );
};
