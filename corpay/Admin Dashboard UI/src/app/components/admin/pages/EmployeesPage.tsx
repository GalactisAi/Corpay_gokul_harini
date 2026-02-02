import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { FileUpload } from '../FileUpload';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Upload, ImageIcon } from 'lucide-react';
import axios from 'axios';

interface Employee {
  id: string;
  name: string;
  milestone: string;
  description: string;
  photoUrl?: string;
  date: string;
}

const MILESTONE_EMOJI: Record<string, string> = {
  'Work Anniversary': '📅',
  'Promotion': '📈',
  'Birthday': '🎂',
  'Achievement': '🏆',
  'New Hire': '✨',
};

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    milestone: '',
    description: '',
    photoUrl: '',
    date: ''
  });

  // Load employees from API on mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      // Try dev endpoint first
      let response;
      try {
        response = await axios.get(`${API_BASE_URL}/api/admin/employees/dev`, { timeout: 5000 });
      } catch (devError: any) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        response = await axios.get(`${API_BASE_URL}/api/admin/employees`, { headers, timeout: 5000 });
      }
      
      const employeesData = response.data || [];
      // Transform backend format to UI format
      const transformedEmployees = employeesData.map((emp: any) => ({
        id: emp.id.toString(),
        name: emp.name,
        milestone: emp.milestone_type === 'anniversary' ? 'Work Anniversary' :
                   emp.milestone_type === 'promotion' ? 'Promotion' :
                   emp.milestone_type === 'birthday' ? 'Birthday' :
                   emp.milestone_type === 'new_hire' ? 'New Hire' : emp.milestone_type,
        description: emp.description,
        photoUrl: emp.avatar_path || '',
        date: emp.milestone_date ? new Date(emp.milestone_date).toISOString().split('T')[0] : ''
      }));
      setEmployees(transformedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.milestone || !formData.description || !formData.date) {
      toast.error('Please fill in all fields');
      return;
    }

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');

    // Map UI milestone types to backend types
    const milestoneTypeMap: Record<string, string> = {
      'Work Anniversary': 'anniversary',
      'Promotion': 'promotion',
      'Birthday': 'birthday',
      'Achievement': 'promotion',
      'New Hire': 'new_hire'
    };

    let avatarPath = formData.photoUrl || null;

    // Upload photo file if provided (upload first to get the path)
    if (photoFile) {
      try {
        const formDataUpload = new FormData();
        formDataUpload.append('file', photoFile);
        
        // Upload photo to get the path
        let uploadResponse;
        try {
          // Append employee_id as form field
          formDataUpload.append('employee_id', '0');
          
          uploadResponse = await axios.post(
            `${API_BASE_URL}/api/admin/employees/upload-photo-dev`,
            formDataUpload,
            { 
              timeout: 30000
            }
          );
          avatarPath = uploadResponse.data.avatar_path;
          console.log('Photo uploaded, path:', avatarPath);
        } catch (uploadError: any) {
          console.error('Photo upload error:', uploadError);
          toast.error('Failed to upload photo. Continuing without photo.');
          // Continue without photo if upload fails
        }
      } catch (error: any) {
        console.error('Error uploading photo:', error);
        // Continue without photo
      }
    }

    const milestoneData = {
      name: formData.name,
      description: formData.description,
      avatar_path: avatarPath,
      border_color: '#981239',
      background_color: '#fef5f8',
      milestone_type: milestoneTypeMap[formData.milestone] || 'anniversary',
      department: null,
      milestone_date: new Date(formData.date).toISOString()
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      let response;
      if (editingEmployee) {
        // Update existing milestone
        const milestoneId = editingEmployee.id;
        const updatePayload = { headers: { 'Content-Type': 'application/json' }, timeout: 10000 };
        const updatePayloadAuth = { headers, timeout: 10000 };
        try {
          try {
            response = await axios.put(
              `${API_BASE_URL}/api/admin/employees/dev/${milestoneId}`,
              milestoneData,
              updatePayload
            );
          } catch (putError: any) {
            if (putError.response?.status === 405) {
              response = await axios.patch(
                `${API_BASE_URL}/api/admin/employees/dev/${milestoneId}`,
                milestoneData,
                updatePayload
              );
            } else {
              throw putError;
            }
          }
        } catch (devError: any) {
          try {
            response = await axios.put(
              `${API_BASE_URL}/api/admin/employees/${milestoneId}`,
              milestoneData,
              updatePayloadAuth
            );
          } catch (putError: any) {
            if (putError.response?.status === 405) {
              response = await axios.patch(
                `${API_BASE_URL}/api/admin/employees/${milestoneId}`,
                milestoneData,
                updatePayloadAuth
              );
            } else {
              throw putError;
            }
          }
        }
        // If user selected a new photo, upload and link to this milestone
        if (photoFile && avatarPath) {
          const formDataUpload = new FormData();
          formDataUpload.append('file', photoFile);
          formDataUpload.append('employee_id', milestoneId);
          try {
            await axios.post(
              `${API_BASE_URL}/api/admin/employees/upload-photo-dev`,
              formDataUpload,
              { timeout: 30000 }
            );
          } catch (uploadError: any) {
            console.error('Photo upload on update failed:', uploadError);
          }
        } else if (photoFile && response?.data?.id) {
          const formDataUpload = new FormData();
          formDataUpload.append('file', photoFile);
          formDataUpload.append('employee_id', response.data.id.toString());
          try {
            await axios.post(
              `${API_BASE_URL}/api/admin/employees/upload-photo-dev`,
              formDataUpload,
              { timeout: 30000 }
            );
          } catch (uploadError: any) {
            console.error('Photo upload on update failed:', uploadError);
          }
        }
      } else {
        // Create new milestone
        try {
          response = await axios.post(
            `${API_BASE_URL}/api/admin/employees/dev`,
            milestoneData,
            { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
          );
          
          // If we have a photo file and milestone was created, upload photo with the new ID
          if (photoFile && response.data && response.data.id && !avatarPath) {
            const formDataUpload = new FormData();
            formDataUpload.append('file', photoFile);
            formDataUpload.append('employee_id', response.data.id.toString());
            try {
              const uploadResponse = await axios.post(
                `${API_BASE_URL}/api/admin/employees/upload-photo-dev`,
                formDataUpload,
                { 
                  timeout: 30000
                }
              );
              // Update milestone with photo path
              avatarPath = uploadResponse.data.avatar_path;
            } catch (uploadError: any) {
              console.error('Photo upload after creation failed:', uploadError);
            }
          }
        } catch (devError: any) {
          response = await axios.post(
            `${API_BASE_URL}/api/admin/employees`,
            milestoneData,
            { headers, timeout: 10000 }
          );
          
          // Upload photo with new ID if needed
          if (photoFile && response.data && response.data.id && !avatarPath) {
            const formDataUpload = new FormData();
            formDataUpload.append('file', photoFile);
            formDataUpload.append('employee_id', response.data.id.toString());
            const uploadHeaders: Record<string, string> = {};
            if (token) {
              uploadHeaders['Authorization'] = `Bearer ${token}`;
            }
            try {
              const uploadResponse = await axios.post(
                `${API_BASE_URL}/api/admin/employees/upload-photo`,
                formDataUpload,
                { 
                  headers: uploadHeaders,
                  timeout: 30000
                }
              );
              // Photo uploaded and linked to milestone
            } catch (uploadError: any) {
              console.error('Photo upload after creation failed:', uploadError);
            }
          }
        }
      }

      toast.success(editingEmployee ? 'Employee milestone updated successfully' : 'Employee milestone saved successfully to backend');
      handleDialogClose();
      fetchEmployees(); // Reload from backend
    } catch (error: any) {
      console.error('Error saving employee:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Network Error';
      const apiUrl = `${API_BASE_URL}/api/admin/employees/dev`;
      console.error(`Failed to POST to: ${apiUrl}`, error);
      
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || !error.response) {
        toast.error(`Failed to save: Cannot connect to backend at ${API_BASE_URL}. Is the backend running?`);
      } else {
        toast.error(`Failed to save: ${errorMessage}`);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      // Try dev endpoint first
      try {
        await axios.delete(`${API_BASE_URL}/api/admin/employees/dev/${id}`, { timeout: 10000 });
      } catch (devError: any) {
        await axios.delete(`${API_BASE_URL}/api/admin/employees/${id}`, { headers, timeout: 10000 });
      }
      
      toast.success('Employee milestone deleted successfully');
      fetchEmployees(); // Reload from backend
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast.error(`Failed to delete: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      milestone: employee.milestone,
      description: employee.description,
      photoUrl: employee.photoUrl || '',
      date: employee.date
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEmployee(null);
    setFormData({ name: '', milestone: '', description: '', photoUrl: '', date: '' });
    setPhotoFile(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-white mb-2">Employee Milestones</h1>
          <p className="text-gray-400">Manage employee achievements and milestones</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-pink-600 hover:bg-pink-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#3d0f1f] border-white/20 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Employee Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label>Milestone Type</Label>
                <select
                  value={formData.milestone}
                  onChange={(e) => setFormData({ ...formData, milestone: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white"
                >
                  <option value="">Select milestone...</option>
                  <option value="Work Anniversary">📅 Work Anniversary</option>
                  <option value="Promotion">📈 Promotion</option>
                  <option value="Birthday">🎂 Birthday</option>
                  <option value="Achievement">🏆 Achievement</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="10 Years in Finance"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <FileUpload
                selectedFile={photoFile}
                onFileSelect={setPhotoFile}
                onClear={() => setPhotoFile(null)}
                accept={{
                  'image/*': ['.png', '.jpg', '.jpeg', '.gif']
                }}
                label="Employee Photo"
              />

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleDialogClose} className="border-white/20">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-pink-600 hover:bg-pink-700">
                  {editingEmployee ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white">All Employee Milestones</CardTitle>
          <CardDescription className="text-gray-400">
            {employees.length} total milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-gray-300">Name</TableHead>
                <TableHead className="text-gray-300">Milestone</TableHead>
                <TableHead className="text-gray-300">Description</TableHead>
                <TableHead className="text-gray-300">Date</TableHead>
                <TableHead className="text-gray-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-white">{employee.name}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-300">
                      {MILESTONE_EMOJI[employee.milestone] ? `${MILESTONE_EMOJI[employee.milestone]} ` : ''}{employee.milestone}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-400">{employee.description}</TableCell>
                  <TableCell className="text-gray-400">{employee.date}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(employee)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(employee.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
