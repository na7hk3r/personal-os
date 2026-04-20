import { MeasurementsForm } from '../components/MeasurementsForm'
import { MeasurementsTable } from '../components/MeasurementsTable'

export function MeasurementsPage() {
  return (
    <div className="space-y-6">
      <MeasurementsForm />
      <MeasurementsTable />
    </div>
  )
}
