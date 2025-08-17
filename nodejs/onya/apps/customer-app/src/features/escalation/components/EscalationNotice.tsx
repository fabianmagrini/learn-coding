import { Clock, User, AlertCircle } from 'lucide-react';
import { EscalationStatus } from '@/shared/types/chat.types';
import { Button } from '@/shared/components/ui/Button';

interface EscalationNoticeProps {
  escalationStatus: EscalationStatus;
  onCancelEscalation?: () => void;
  canCancel?: boolean;
}

export function EscalationNotice({ 
  escalationStatus, 
  onCancelEscalation,
  canCancel = false
}: EscalationNoticeProps) {
  if (!escalationStatus.escalated) {
    return null;
  }

  const hasOperator = !!escalationStatus.operatorId;

  return (
    <div className="mx-4 mt-4 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {hasOperator ? (
            <User className="h-6 w-6 text-amber-600" />
          ) : (
            <Clock className="h-6 w-6 text-amber-600" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-medium text-amber-800">
              {hasOperator ? 'Connected to Agent' : 'Connecting you to an agent'}
            </h3>
            {escalationStatus.reason && (
              <span className="text-sm text-amber-600">
                ({escalationStatus.reason})
              </span>
            )}
          </div>
          
          {hasOperator ? (
            <div className="text-amber-700">
              <p>You're now connected with {escalationStatus.operatorName || 'an agent'}.</p>
              <p className="text-sm mt-1">They'll be able to help you with your request.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-amber-700">
                <p>We're connecting you with a human agent who can better assist you.</p>
              </div>
              
              {escalationStatus.queuePosition && (
                <div className="flex items-center space-x-4 text-sm text-amber-600">
                  <div className="flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>Position in queue: {escalationStatus.queuePosition}</span>
                  </div>
                  
                  {escalationStatus.estimatedWaitTime && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        Estimated wait: {escalationStatus.estimatedWaitTime} min
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {canCancel && !hasOperator && onCancelEscalation && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelEscalation}
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Continue with AI assistant
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {!hasOperator && (
        <div className="mt-3 pt-3 border-t border-amber-200">
          <p className="text-sm text-amber-600">
            You can continue chatting while you wait. Our AI assistant will remain available to help.
          </p>
        </div>
      )}
    </div>
  );
}