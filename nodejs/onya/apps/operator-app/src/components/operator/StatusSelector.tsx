import React from 'react';
import { Listbox } from '@headlessui/react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { OperatorStatus } from '@/types/operator.types';
import { useOperatorStore } from '@/stores/operatorStore';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

const statusOptions = [
  { value: OperatorStatus.ONLINE, label: 'Online', description: 'Available for new chats' },
  { value: OperatorStatus.BUSY, label: 'Busy', description: 'Handling current chats only' },
  { value: OperatorStatus.AWAY, label: 'Away', description: 'Away from desk' },
  { value: OperatorStatus.OFFLINE, label: 'Offline', description: 'Not available' },
];

export const StatusSelector: React.FC = () => {
  const { status, updateStatus } = useOperatorStore();

  const selectedOption = statusOptions.find(option => option.value === status) || statusOptions[0];

  return (
    <Listbox value={status} onChange={updateStatus}>
      <div className="relative">
        <Listbox.Button className="relative w-36 cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset ring-secondary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm">
          <div className="flex items-center gap-2">
            <StatusIndicator status={status} size="sm" />
            <span className="block truncate font-medium">
              {selectedOption.label}
            </span>
          </div>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="h-4 w-4 text-secondary-400" aria-hidden="true" />
          </span>
        </Listbox.Button>

        <Listbox.Options className="absolute right-0 z-10 mt-1 max-h-60 w-64 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {statusOptions.map((option) => (
            <Listbox.Option
              key={option.value}
              className={({ active }) =>
                clsx(
                  'relative cursor-pointer select-none py-3 px-4',
                  active ? 'bg-primary-50 text-primary-900' : 'text-secondary-900'
                )
              }
              value={option.value}
            >
              {({ selected, active }) => (
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <StatusIndicator status={option.value} size="sm" />
                    <div>
                      <div className={clsx('font-medium', selected && 'text-primary-600')}>
                        {option.label}
                      </div>
                      <div className="text-xs text-secondary-500 mt-1">
                        {option.description}
                      </div>
                    </div>
                  </div>
                  {selected && (
                    <Check className="h-4 w-4 text-primary-600" aria-hidden="true" />
                  )}
                </div>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  );
};