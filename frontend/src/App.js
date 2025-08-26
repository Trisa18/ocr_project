import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Calendar, User, MapPin, Clock, DollarSign, FileText, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Token management
const TokenManager = {
  setToken: (token) => localStorage.setItem('authToken', token),
  getToken: () => localStorage.getItem('authToken'),
  removeToken: () => localStorage.removeItem('authToken'),
  isAuthenticated: () => !!localStorage.getItem('authToken')
};

// Axios interceptor
axios.defaults.headers.common['Authorization'] = TokenManager.getToken() ? `Bearer ${TokenManager.getToken()}` : '';

const LoginScreen = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState('');

  const handleLogin = (role) => {
    const token = role === 'manager' ? 'manager' : 'employee';
    TokenManager.setToken(token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    onLogin(role);
    toast.success(`Logged in as ${role}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">AI Trip Management</CardTitle>
          <CardDescription>Select your role to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => handleLogin('employee')} 
            className="w-full h-12 bg-blue-600 hover:bg-blue-700"
          >
            <User className="mr-2 h-4 w-4" />
            Login as Employee
          </Button>
          <Button 
            onClick={() => handleLogin('manager')} 
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Login as Manager
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/analytics/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard');
    }
  };

  if (!stats) return <div className="p-6">Loading...</div>;

  if (user.is_manager) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Manager Dashboard</h1>
          <Badge variant="secondary" className="px-3 py-1">Manager</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.total_trips}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending_trips}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active_trips}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.total_expenses}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.pending_expenses}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">₹{stats.total_spend?.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } else {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
          <Badge className="px-3 py-1 bg-blue-100 text-blue-800">Employee</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">My Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.my_trips}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.my_active_trips}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">My Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.my_expenses}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">My Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">₹{stats.my_spend?.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
};

const TripsPage = ({ user }) => {
  const [trips, setTrips] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(false);

  const [newTrip, setNewTrip] = useState({
    destination: '',
    duration: '',
    purpose: '',
    start_date: '',
    end_date: ''
  });

  const [approvalData, setApprovalData] = useState({
    approved_budget: {},
    notes: ''
  });

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await axios.get(`${API}/trips`);
      setTrips(response.data);
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast.error('Failed to load trips');
    }
  };

  const createTrip = async () => {
    if (!newTrip.destination || !newTrip.duration || !newTrip.purpose) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/trips`, {
        ...newTrip,
        duration: parseInt(newTrip.duration)
      });
      toast.success('Trip request created with AI budget allocation!');
      setShowCreateDialog(false);
      setNewTrip({ destination: '', duration: '', purpose: '', start_date: '', end_date: '' });
      fetchTrips();
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip request');
    } finally {
      setLoading(false);
    }
  };

  const approveTrip = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/trips/${selectedTrip.id}/approve`, approvalData);
      toast.success('Trip budget approved!');
      setShowApprovalDialog(false);
      fetchTrips();
    } catch (error) {
      console.error('Error approving trip:', error);
      toast.error('Failed to approve trip');
    } finally {
      setLoading(false);
    }
  };

  const rejectTrip = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/trips/${selectedTrip.id}/reject`, { notes: approvalData.notes });
      toast.success('Trip budget rejected');
      setShowApprovalDialog(false);
      fetchTrips();
    } catch (error) {
      console.error('Error rejecting trip:', error);
      toast.error('Failed to reject trip');
    } finally {
      setLoading(false);
    }
  };

  const startTrip = async (tripId) => {
    try {
      await axios.put(`${API}/trips/${tripId}/start`);
      toast.success('Trip started! You can now submit expenses.');
      fetchTrips();
    } catch (error) {
      console.error('Error starting trip:', error);
      toast.error('Failed to start trip');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { variant: "secondary", color: "text-orange-600", icon: AlertCircle },
      approved: { variant: "default", color: "text-green-600", icon: CheckCircle },
      rejected: { variant: "destructive", color: "text-red-600", icon: XCircle },
      in_progress: { variant: "outline", color: "text-blue-600", icon: Clock },
      completed: { variant: "default", color: "text-emerald-600", icon: CheckCircle }
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="capitalize">
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">
          {user.is_manager ? 'All Trip Requests' : 'My Trip Requests'}
        </h1>
        {!user.is_manager && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <MapPin className="mr-2 h-4 w-4" />
                Create Trip Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Trip Request</DialogTitle>
                <DialogDescription>AI will automatically calculate the optimal budget for your trip</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="destination">Destination*</Label>
                  <Input
                    id="destination"
                    value={newTrip.destination}
                    onChange={(e) => setNewTrip({ ...newTrip, destination: e.target.value })}
                    placeholder="e.g., Mumbai, New York, London"
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (days)*</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newTrip.duration}
                    onChange={(e) => setNewTrip({ ...newTrip, duration: e.target.value })}
                    placeholder="e.g., 5"
                  />
                </div>
                <div>
                  <Label htmlFor="purpose">Purpose*</Label>
                  <Textarea
                    id="purpose"
                    value={newTrip.purpose}
                    onChange={(e) => setNewTrip({ ...newTrip, purpose: e.target.value })}
                    placeholder="e.g., Client meeting, Conference, Training"
                  />
                </div>
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newTrip.start_date}
                    onChange={(e) => setNewTrip({ ...newTrip, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newTrip.end_date}
                    onChange={(e) => setNewTrip({ ...newTrip, end_date: e.target.value })}
                  />
                </div>
                <Button onClick={createTrip} disabled={loading} className="w-full">
                  {loading ? 'Creating...' : 'Create Trip Request'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {trips.map((trip) => (
          <Card key={trip.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-lg">{trip.destination}</span>
                    {getStatusBadge(trip.status)}
                  </div>
                  <p className="text-gray-600">{trip.purpose}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {trip.duration} days
                    </span>
                    {trip.start_date && (
                      <span>{trip.start_date} - {trip.end_date}</span>
                    )}
                  </div>
                  
                  {trip.ai_budget && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">🤖 AI Recommended Budget</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <span>Travel: ₹{trip.ai_budget.travel?.toLocaleString()}</span>
                        <span>Accommodation: ₹{trip.ai_budget.accommodation_per_night?.toLocaleString()}/night</span>
                        <span>Food: ₹{trip.ai_budget.food_per_day?.toLocaleString()}/day</span>
                        <span>Transport: ₹{trip.ai_budget.local_transport_per_day?.toLocaleString()}/day</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        <span className="font-semibold text-blue-800">
                          Total Budget: ₹{trip.ai_budget.total_budget?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {trip.manager_notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Manager Notes</h4>
                      <p className="text-sm text-gray-600">{trip.manager_notes}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {user.is_manager && trip.status === 'pending' && (
                    <Button
                      onClick={() => {
                        setSelectedTrip(trip);
                        setApprovalData({ approved_budget: trip.ai_budget || {}, notes: '' });
                        setShowApprovalDialog(true);
                      }}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Review
                    </Button>
                  )}
                  
                  {!user.is_manager && trip.status === 'approved' && (
                    <Button
                      onClick={() => startTrip(trip.id)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Start Trip
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Manager Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Trip Budget</DialogTitle>
            <DialogDescription>
              Review and approve/modify the AI-generated budget for {selectedTrip?.destination}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTrip?.ai_budget && (
              <div className="space-y-3">
                <div>
                  <Label>Travel Budget</Label>
                  <Input
                    type="number"
                    value={approvalData.approved_budget.travel || selectedTrip.ai_budget.travel || 0}
                    onChange={(e) => setApprovalData({
                      ...approvalData,
                      approved_budget: { ...approvalData.approved_budget, travel: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label>Accommodation (per night)</Label>
                  <Input
                    type="number"
                    value={approvalData.approved_budget.accommodation_per_night || selectedTrip.ai_budget.accommodation_per_night || 0}
                    onChange={(e) => setApprovalData({
                      ...approvalData,
                      approved_budget: { ...approvalData.approved_budget, accommodation_per_night: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label>Food (per day)</Label>
                  <Input
                    type="number"
                    value={approvalData.approved_budget.food_per_day || selectedTrip.ai_budget.food_per_day || 0}
                    onChange={(e) => setApprovalData({
                      ...approvalData,
                      approved_budget: { ...approvalData.approved_budget, food_per_day: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label>Manager Notes</Label>
                  <Textarea
                    value={approvalData.notes}
                    onChange={(e) => setApprovalData({ ...approvalData, notes: e.target.value })}
                    placeholder="Optional notes for the employee"
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={approveTrip} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                {loading ? 'Approving...' : 'Approve'}
              </Button>
              <Button onClick={rejectTrip} disabled={loading} variant="destructive">
                {loading ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ExpensesPage = ({ user }) => {
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [loading, setLoading] = useState(false);

  const [manualExpense, setManualExpense] = useState({
    trip_id: '',
    vendor: '',
    amount: '',
    category: '',
    date: '',
    items: []
  });

  useEffect(() => {
    fetchExpenses();
    fetchTrips();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await axios.get(`${API}/expenses`);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    }
  };

  const fetchTrips = async () => {
    try {
      const response = await axios.get(`${API}/trips`);
      setTrips(response.data.filter(trip => trip.status === 'in_progress'));
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedTripId) {
      toast.error('Please select a file and trip');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API}/expenses/upload?trip_id=${selectedTripId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Receipt processed with AI OCR! Please review the extracted data.');
      setShowUploadDialog(false);
      setSelectedFile(null);
      setSelectedTripId('');
      fetchExpenses();
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast.error('Failed to process receipt');
    } finally {
      setLoading(false);
    }
  };

  const createManualExpense = async () => {
    if (!manualExpense.trip_id || !manualExpense.vendor || !manualExpense.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/expenses`, {
        ...manualExpense,
        amount: parseFloat(manualExpense.amount)
      });
      toast.success('Expense created successfully');
      setShowManualDialog(false);
      setManualExpense({ trip_id: '', vendor: '', amount: '', category: '', date: '', items: [] });
      fetchExpenses();
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  const approveExpense = async (expenseId, status) => {
    try {
      await axios.put(`${API}/expenses/${expenseId}/approve`, { status });
      toast.success(`Expense ${status}`);
      fetchExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { variant: "secondary", color: "text-orange-600", icon: AlertCircle },
      approved: { variant: "default", color: "text-green-600", icon: CheckCircle },
      rejected: { variant: "destructive", color: "text-red-600", icon: XCircle }
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="capitalize">
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">
          {user.is_manager ? 'All Expenses' : 'My Expenses'}
        </h1>
        {!user.is_manager && (
          <div className="flex gap-2">
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Receipt
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Receipt with AI OCR</DialogTitle>
                  <DialogDescription>Upload a receipt and AI will automatically extract the details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Trip</Label>
                    <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a trip" />
                      </SelectTrigger>
                      <SelectContent>
                        {trips.map((trip) => (
                          <SelectItem key={trip.id} value={trip.id}>
                            {trip.destination} - {trip.purpose}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Receipt Image</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                    />
                  </div>
                  <Button onClick={handleFileUpload} disabled={loading} className="w-full">
                    {loading ? 'Processing...' : 'Upload & Process with AI'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Manual Entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Expense Manually</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Trip</Label>
                    <Select value={manualExpense.trip_id} onValueChange={(value) => setManualExpense({ ...manualExpense, trip_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a trip" />
                      </SelectTrigger>
                      <SelectContent>
                        {trips.map((trip) => (
                          <SelectItem key={trip.id} value={trip.id}>
                            {trip.destination} - {trip.purpose}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Vendor</Label>
                    <Input
                      value={manualExpense.vendor}
                      onChange={(e) => setManualExpense({ ...manualExpense, vendor: e.target.value })}
                      placeholder="e.g., Hotel Taj, Uber, Restaurant"
                    />
                  </div>
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      value={manualExpense.amount}
                      onChange={(e) => setManualExpense({ ...manualExpense, amount: e.target.value })}
                      placeholder="e.g., 1500"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={manualExpense.category} onValueChange={(value) => setManualExpense({ ...manualExpense, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Transport">Transport</SelectItem>
                        <SelectItem value="Accommodation">Accommodation</SelectItem>
                        <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={manualExpense.date}
                      onChange={(e) => setManualExpense({ ...manualExpense, date: e.target.value })}
                    />
                  </div>
                  <Button onClick={createManualExpense} disabled={loading} className="w-full">
                    {loading ? 'Creating...' : 'Create Expense'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {expenses.map((expense) => (
          <Card key={expense.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-lg">{expense.vendor}</span>
                    {getStatusBadge(expense.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-medium">₹{expense.amount?.toLocaleString()}</span>
                    <Badge variant="outline">{expense.category}</Badge>
                    <span>{expense.date}</span>
                  </div>
                  
                  {expense.items && expense.items.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">Items: {expense.items.join(', ')}</p>
                    </div>
                  )}
                  
                  {expense.receipt_filename && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        📄 {expense.receipt_filename}
                      </Badge>
                    </div>
                  )}
                  
                  {expense.manager_notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Manager Notes</h4>
                      <p className="text-sm text-gray-600">{expense.manager_notes}</p>
                    </div>
                  )}
                </div>
                
                {user.is_manager && expense.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => approveExpense(expense.id, 'approved')}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => approveExpense(expense.id, 'rejected')}
                      size="sm"
                      variant="destructive"
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const Navigation = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-800">AI Trip Management</h1>
              <Badge variant="outline" className="text-xs">
                {user.name} ({user.role})
              </Badge>
            </div>
            <Button onClick={onLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-white border-b rounded-none h-12 px-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="trips" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Trips
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <Dashboard user={user} />
        </TabsContent>
        
        <TabsContent value="trips" className="mt-0">
          <TripsPage user={user} />
        </TabsContent>
        
        <TabsContent value="expenses" className="mt-0">
          <ExpensesPage user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const token = TokenManager.getToken();
    if (token) {
      setIsAuthenticated(true);
      // Mock user data based on token
      const userData = token === 'manager' 
        ? { id: 'mgr1', email: 'manager@company.com', name: 'Jane Manager', role: 'manager', is_manager: true }
        : { id: 'emp1', email: 'employee@company.com', name: 'John Employee', role: 'senior', is_manager: false };
      setUser(userData);
    }
  }, []);

  const handleLogin = (role) => {
    setIsAuthenticated(true);
    const userData = role === 'manager' 
      ? { id: 'mgr1', email: 'manager@company.com', name: 'Jane Manager', role: 'manager', is_manager: true }
      : { id: 'emp1', email: 'employee@company.com', name: 'John Employee', role: 'senior', is_manager: false };
    setUser(userData);
  };

  const handleLogout = () => {
    TokenManager.removeToken();
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <BrowserRouter>
      <div className="App">
        <Toaster position="top-right" />
        {!isAuthenticated ? (
          <LoginScreen onLogin={handleLogin} />
        ) : (
          <Navigation user={user} onLogout={handleLogout} />
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;