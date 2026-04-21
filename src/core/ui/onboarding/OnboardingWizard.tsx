import { useState } from 'react'
import { useCoreStore } from '../../state/coreStore'
import { pluginManager } from '../../plugins/PluginManager'
import { StepWelcome } from './steps/StepWelcome'
import { StepName } from './steps/StepName'
import { StepPlugins, type PluginSelection } from './steps/StepPlugins'
import { StepFitnessConfig, type FitnessConfig } from './steps/StepFitnessConfig'
import { StepSummary } from './steps/StepSummary'

type Step = 'welcome' | 'name' | 'plugins' | 'fitness' | 'summary'

const STEPS: Step[] = ['welcome', 'name', 'plugins', 'fitness', 'summary']

const DOTS_STEPS: Step[] = ['name', 'plugins', 'fitness', 'summary']

export function OnboardingWizard() {
  const { updateProfile, setActivePlugins, completeOnboarding, persistProfile } = useCoreStore()

  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('')
  const [plugins, setPlugins] = useState<PluginSelection>({ fitness: true, work: true })
  const [fitnessConfig, setFitnessConfig] = useState<FitnessConfig>({
    goal: 'consistency',
    smokingTracker: false,
    currentWeight: '',
    weightGoal: '',
  })

  const goTo = (s: Step) => setStep(s)

  const handleName = (n: string) => {
    setName(n)
    updateProfile({ name: n })
    goTo('plugins')
  }

  const handlePlugins = (sel: PluginSelection) => {
    setPlugins(sel)
    if (sel.fitness) {
      goTo('fitness')
    } else {
      goTo('summary')
    }
  }

  const handleFitness = async (cfg: FitnessConfig) => {
    setFitnessConfig(cfg)
    updateProfile({
      weightGoal: parseFloat(cfg.weightGoal) || 0,
    })

    // Persist fitness preferences in plugin_state
    if (window.storage) {
      await window.storage.execute(
        `INSERT OR REPLACE INTO plugin_state (plugin_id, key, value) VALUES ('fitness', 'goal', ?)`,
        [cfg.goal],
      )
      await window.storage.execute(
        `INSERT OR REPLACE INTO plugin_state (plugin_id, key, value) VALUES ('fitness', 'smokingTracker', ?)`,
        [cfg.smokingTracker ? 'true' : 'false'],
      )
      if (cfg.currentWeight) {
        // Insert initial weight entry
        await window.storage.execute(
          `INSERT OR IGNORE INTO fitness_daily_entries (id, date, weight, created_at, updated_at)
           VALUES (lower(hex(randomblob(8))), date('now'), ?, datetime('now'), datetime('now'))`,
          [parseFloat(cfg.currentWeight)],
        )
      }
    }

    goTo('summary')
  }

  const handleFinish = async () => {
    const activeIds = Object.entries(plugins)
      .filter(([, v]) => v)
      .map(([k]) => k)

    // Update Zustand store (triggers storage persistence)
    setActivePlugins(activeIds)

    // Persist active plugins list to storage
    if (window.storage) {
      await window.storage.execute(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('activePlugins', ?)`,
        [JSON.stringify(activeIds)],
      )
    }

    // Synchronize PluginManager state with the new selection
    for (const plugin of pluginManager.getAllPlugins()) {
      if (activeIds.includes(plugin.manifest.id)) {
        // Initialize if not already active
        if (plugin.status === 'registered' || plugin.status === 'inactive') {
          await pluginManager.initPlugin(plugin.manifest.id)
        }
      } else {
        // Deactivate if currently active
        if (plugin.status === 'active') {
          pluginManager.deactivatePlugin(plugin.manifest.id)
        }
      }
    }

    await persistProfile()
    await completeOnboarding()
  }

  // Progress dots (skip 'welcome' step)
  const dotIndex = DOTS_STEPS.indexOf(step)

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface/95 backdrop-blur-sm p-6">
      {/* Progress dots */}
      {step !== 'welcome' && (
        <div className="absolute top-8 flex gap-2">
          {DOTS_STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === dotIndex ? 'w-6 bg-accent' : i < dotIndex ? 'w-3 bg-accent/40' : 'w-3 bg-border'
              }`}
            />
          ))}
        </div>
      )}

      {/* Step content */}
      <div className="w-full max-w-xl">
        {step === 'welcome' && <StepWelcome onNext={() => goTo('name')} />}
        {step === 'name' && <StepName initialName={name} onNext={handleName} />}
        {step === 'plugins' && (
          <StepPlugins initial={plugins} onNext={handlePlugins} />
        )}
        {step === 'fitness' && (
          <StepFitnessConfig initial={fitnessConfig} onNext={handleFitness} />
        )}
        {step === 'summary' && (
          <StepSummary
            name={name}
            plugins={plugins}
            fitnessGoal={plugins.fitness ? fitnessConfig.goal : undefined}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  )
}
