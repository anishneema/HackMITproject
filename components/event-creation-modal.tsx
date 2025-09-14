import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Clock, MapPin, Users, Plus, Upload, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CSVReader } from "@/lib/email-automation/csv-reader";

interface EventCreationModalProps {
  onEventCreated: (event: {
    name: string;
    date: string;
    time: string;
    location: string;
    targetDonors: number;
    csvFile?: File;
  }) => void;
  children: React.ReactNode;
}

export function EventCreationModal({ onEventCreated, children }: EventCreationModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: undefined as Date | undefined,
    time: '',
    location: '',
    targetDonors: 50
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContacts, setCsvContacts] = useState<any[]>([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Event date is required';
    }
    
    if (!formData.time.trim()) {
      newErrors.time = 'Event time is required';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Event location is required';
    }
    
    if (formData.targetDonors < 1) {
      newErrors.targetDonors = 'Target donors must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const eventData = {
      name: formData.name,
      date: formData.date ? format(formData.date, 'yyyy-MM-dd') : '',
      time: formData.time,
      location: formData.location,
      targetDonors: formData.targetDonors,
      csvFile: csvFile || undefined
    };

    onEventCreated(eventData);
    
    // Reset form
    setFormData({
      name: '',
      date: undefined,
      time: '',
      location: '',
      targetDonors: 50
    });
    setCsvFile(null);
    setCsvContacts([]);
    setErrors({});
    setOpen(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrors(prev => ({ ...prev, csvFile: 'Please upload a CSV file' }));
      return;
    }

    setIsProcessingCsv(true);
    setErrors(prev => ({ ...prev, csvFile: '' }));

    try {
      const contacts = await CSVReader.parseCSVFile(file);
      if (contacts.length === 0) {
        throw new Error('No valid contacts found in the CSV file');
      }

      setCsvFile(file);
      setCsvContacts(contacts);
      
      // Update target donors to match CSV contacts if it's still the default
      if (formData.targetDonors === 50) {
        setFormData(prev => ({ ...prev, targetDonors: contacts.length }));
      }
    } catch (error) {
      console.error('Error processing CSV file:', error);
      setErrors(prev => ({ 
        ...prev, 
        csvFile: error instanceof Error ? error.message : 'Failed to process CSV file' 
      }));
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const removeCsvFile = () => {
    setCsvFile(null);
    setCsvContacts([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Blood Drive Event
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Event Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Community Blood Drive"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={cn(errors.name && "border-red-500")}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Event Date *</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="date"
                    type="date"
                    value={formData.date ? format(formData.date, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      const dateValue = e.target.value ? new Date(e.target.value) : undefined;
                      handleInputChange('date', dateValue);
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className={cn("pl-10", errors.date && "border-red-500")}
                  />
                </div>
                {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Event Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className={cn("pl-10", errors.time && "border-red-500")}
                  />
                </div>
                {errors.time && <p className="text-sm text-red-500">{errors.time}</p>}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="e.g., Community Center, 123 Main St"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className={cn("pl-10", errors.location && "border-red-500")}
                />
              </div>
              {errors.location && <p className="text-sm text-red-500">{errors.location}</p>}
            </div>

            {/* Target Donors */}
            <div className="space-y-2">
              <Label htmlFor="targetDonors">Target Donors</Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="targetDonors"
                  type="number"
                  min="1"
                  value={formData.targetDonors}
                  onChange={(e) => handleInputChange('targetDonors', parseInt(e.target.value) || 0)}
                  className={cn("pl-10", errors.targetDonors && "border-red-500")}
                />
              </div>
              {errors.targetDonors && <p className="text-sm text-red-500">{errors.targetDonors}</p>}
            </div>

            {/* CSV Upload */}
            <div className="space-y-2">
              <Label htmlFor="csvFile">Volunteer List (CSV) - Optional</Label>
              <div className="space-y-2">
                {!csvFile ? (
                  <div className="space-y-2">
                    <Input
                      ref={fileInputRef}
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      disabled={isProcessingCsv}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV file with volunteer contact information (email, firstName, lastName columns)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">{csvFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {csvContacts.length} contacts found
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeCsvFile}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ✅ CSV uploaded! Emails will be sent to all volunteers when the event is created.
                    </p>
                  </div>
                )}
                {errors.csvFile && <p className="text-sm text-red-500">{errors.csvFile}</p>}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
