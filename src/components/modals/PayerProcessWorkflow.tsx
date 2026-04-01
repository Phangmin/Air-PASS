import type { PayerItem, PayerProcessStage } from '../payer/payerTargetTypes'

type WorkflowStep = {
  id: 1 | 2 | 3 | 4
  label: string
}

const workflowSteps: WorkflowStep[] = [
  { id: 1, label: '사전통지' },
  { id: 2, label: '의견제출' },
  { id: 3, label: '확정통지' },
  { id: 4, label: '완료' },
]

const workflowActiveColor = '#3288FF'
const workflowGlowColor = '#7CC5FF'

function getWorkflowState(item: PayerItem) {
  const processStage = item.processStage as PayerProcessStage | undefined
  const hasOpinionDocument = item.documents.some(
    (document) => document.id === 'opinion-submit' && document.filePath,
  )

  if (item.paymentStatus === 'paid' || processStage === 'completed') {
    return {
      currentStep: 4 as const,
      activeSteps: new Set<number>([4]),
    }
  }

  if (processStage === 'opinion') {
    return {
      currentStep: 2 as const,
      activeSteps: new Set<number>([2]),
    }
  }

  if (item.status === 'confirmed' || processStage === 'final-notice') {
    return {
      currentStep: 3 as const,
      activeSteps: new Set<number>([3]),
    }
  }

  if (hasOpinionDocument) {
    return {
      currentStep: 2 as const,
      activeSteps: new Set<number>([2]),
    }
  }

  return {
    currentStep: 1 as const,
    activeSteps: new Set<number>([1]),
  }
}

type PayerProcessWorkflowProps = {
  item: PayerItem
}

export default function PayerProcessWorkflow({ item }: PayerProcessWorkflowProps) {
  const workflowState = getWorkflowState(item)

  return (
    <section className="px-3 py-4">
      <div className="mx-auto max-w-[620px] overflow-visible px-3 pt-10 pb-6">
        <div className="flex items-start justify-center">
          {workflowSteps.map((step, index) => {
            const isActive = workflowState.activeSteps.has(step.id)
            const isCurrent = workflowState.currentStep === step.id
            const nextStep = workflowSteps[index + 1]
            const hasActiveConnector =
              Boolean(nextStep) &&
              workflowState.activeSteps.has(step.id) &&
              workflowState.activeSteps.has(nextStep.id)

            return (
              <div key={step.id} className="flex items-start">
                <div className="flex w-[70px] flex-col items-center text-center sm:w-[84px]">
                  <div className="relative flex h-[42px] w-[42px] items-center justify-center sm:h-[52px] sm:w-[52px]">
                    {isCurrent ? (
                      <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                        <span
                          className="payer-workflow-ripple h-[42px] w-[42px] rounded-full sm:h-[52px] sm:w-[52px]"
                          style={{ backgroundColor: workflowGlowColor }}
                        />
                        <span
                          className="payer-workflow-ripple absolute h-[42px] w-[42px] rounded-full sm:h-[52px] sm:w-[52px]"
                          style={{ backgroundColor: workflowGlowColor, animationDelay: '1.1s' }}
                        />
                      </span>
                    ) : null}
                    <span
                      className="relative flex h-full w-full items-center justify-center rounded-full text-[22px] font-bold text-white transition sm:text-[28px]"
                      style={{
                        backgroundColor: isActive ? workflowActiveColor : '#D9D9D9',
                        boxShadow: isCurrent ? '0 0 0 1px rgba(50, 136, 255, 0.08)' : 'none',
                      }}
                    >
                      {step.id}
                    </span>
                  </div>
                  <div
                    className={`mt-2 text-[11px] font-semibold leading-none sm:text-[13px] ${
                      isActive ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </div>
                </div>
                {nextStep ? (
                  <div className="mt-[20px] flex w-10 items-center px-1 sm:mt-[25px] sm:w-14 sm:px-2">
                    <span
                      className="block h-[2px] w-full rounded-full transition"
                      style={{ backgroundColor: hasActiveConnector ? workflowActiveColor : '#D9D9D9' }}
                      aria-hidden="true"
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
