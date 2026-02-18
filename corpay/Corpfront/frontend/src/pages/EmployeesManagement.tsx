import { useState, useEffect } from 'react'
import { api } from '../services/api'
import FileUpload from '../components/FileUpload'
import { Plus, Trash2 } from 'lucide-react'

interface Employee {
  id: number
  name: string
  description: string
  avatar_path?: string
  border_color: string
  background_color: string
  milestone_type: string
  department?: string
  milestone_date: string
}

const MILESTONE_OPTIONS = [
  { value: 'anniversary', label: '📅 Work Anniversary' },
  { value: 'birthday', label: '🎂 Birthday' },
  { value: 'promotion', label: '📈 Promotion' },
  { value: 'new_hire', label: '✨ New Hire' },
]

function MilestoneSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = MILESTONE_OPTIONS.find((o) => o.value === value) || MILESTONE_OPTIONS[0]

  return (
    <div className="relative employee-milestone-modal">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="employee-milestone-select w-full flex items-center justify-between px-4 py-2 border rounded-lg"
      >
        <span className="truncate">{selected.label}</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-lg shadow-lg z-50 bg-[#2d141e] border border-[rgba(152,18,57,0.7)] max-h-56 overflow-y-auto">
          {MILESTONE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={`w-full text-left px-4 py-2 text-sm ${
                option.value === value
                  ? 'bg-[#5b1b2e] text-white'
                  : 'text-[#e0e0e0] hover:bg-[#3d1628]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EmployeesManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    milestone_type: 'anniversary',
    department: '',
    milestone_date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/admin/employees')
      setEmployees(response.data)
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    await api.post('/admin/employees/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    alert('Employee file uploaded successfully!')
    fetchEmployees()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const colorMap: Record<string, { border: string; background: string }> = {
        anniversary: { border: '#981239', background: '#fef5f8' },
        birthday: { border: '#BE1549', background: '#fff5f9' },
        promotion: { border: '#981239', background: '#fef5f8' },
        new_hire: { border: '#0085C2', background: '#f0f9fd' },
      }

      const colors = colorMap[formData.milestone_type] || colorMap.anniversary

      await api.post('/admin/employees', {
        ...formData,
        border_color: colors.border,
        background_color: colors.background,
        milestone_date: new Date(formData.milestone_date).toISOString(),
      })
      fetchEmployees()
      setShowForm(false)
      setFormData({
        name: '',
        description: '',
        milestone_type: 'anniversary',
        department: '',
        milestone_date: new Date().toISOString().split('T')[0],
      })
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save employee milestone')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return
    try {
      await api.delete(`/admin/employees/${id}`)
      fetchEmployees()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete milestone')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Employee Milestones</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Milestone
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Excel File</h2>
          <FileUpload
            onUpload={handleFileUpload}
            accept=".xlsx,.xls"
            label="Upload Employee Data"
          />
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 employee-milestone-modal">
            <h2 className="text-xl font-semibold mb-4">Add Milestone</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Milestone Type</label>
                <MilestoneSelect
                  value={formData.milestone_type}
                  onChange={(milestone_type) => setFormData({ ...formData, milestone_type })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={formData.milestone_date}
                  onChange={(e) => setFormData({ ...formData, milestone_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{emp.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.milestone_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

