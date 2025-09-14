import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Contact } from '@/lib/email-automation/csv-reader/types';

interface CSVTableVisualizationProps {
  contacts: Contact[];
  fileName: string;
  showFooter?: boolean;
}

export function CSVTableVisualization({ 
  contacts, 
  fileName, 
  showFooter = true 
}: CSVTableVisualizationProps) {
  if (!contacts || contacts.length === 0) {
    return (
      <div className="border rounded-lg p-4 bg-muted/50">
        <p className="text-muted-foreground text-center">No data to display</p>
      </div>
    );
  }

  // Get all unique keys from contacts to create dynamic columns
  const allKeys = new Set<string>();
  contacts.forEach(contact => {
    Object.keys(contact).forEach(key => {
      if (contact[key as keyof Contact] !== undefined && contact[key as keyof Contact] !== '') {
        allKeys.add(key);
      }
    });
  });

  const columns = Array.from(allKeys).filter(key => 
    key !== 'id' // Exclude internal ID
  );

  // Helper function to format column names
  const formatColumnName = (key: string): string => {
    const formatted = key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
    
    // Common field mappings
    const mappings: Record<string, string> = {
      'First Name': 'Name',
      'Last Name': 'Last Name',
      'Email': 'Email',
      'Organization': 'Organization',
      'Phone': 'Phone',
      'Address': 'Address',
      'City': 'City',
      'State': 'State',
      'Zip': 'Zip',
      'Country': 'Country',
    };
    
    return mappings[formatted] || formatted;
  };

  // Helper function to get display value
  const getDisplayValue = (contact: Contact, key: string): string => {
    const value = contact[key as keyof Contact];
    if (value === undefined || value === '') return '-';
    return String(value);
  };

  // Helper function to combine first and last name if both exist
  const getFullName = (contact: Contact): string => {
    const firstName = contact.firstName || '';
    const lastName = contact.lastName || '';
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return firstName || lastName || '-';
  };

  // Determine if we should show a combined name column
  const hasNameFields = columns.some(col => 
    col.toLowerCase().includes('first') || col.toLowerCase().includes('last')
  );

  // Filter out first/last name columns if we're showing combined name
  const displayColumns = hasNameFields 
    ? columns.filter(col => 
        !col.toLowerCase().includes('first') && 
        !col.toLowerCase().includes('last')
      )
    : columns;

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <div className="p-4 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">📊 CSV Data Preview</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {fileName} • {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {hasNameFields && <TableHead>Name</TableHead>}
              {displayColumns.map((column) => (
                <TableHead key={column} className={column.toLowerCase().includes('balance') || column.toLowerCase().includes('amount') ? 'text-right' : ''}>
                  {formatColumnName(column)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.slice(0, 10).map((contact, index) => (
              <TableRow key={contact.id || index}>
                {hasNameFields && (
                  <TableCell className="font-medium">
                    {getFullName(contact)}
                  </TableCell>
                )}
                {displayColumns.map((column) => (
                  <TableCell 
                    key={column}
                    className={column.toLowerCase().includes('balance') || column.toLowerCase().includes('amount') ? 'text-right' : ''}
                  >
                    {getDisplayValue(contact, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {showFooter && contacts.length > 0 && (
            <TableFooter className="bg-transparent">
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={displayColumns.length + (hasNameFields ? 1 : 0)}>
                  {contacts.length > 10 ? `Showing first 10 of ${contacts.length} contacts` : `Total: ${contacts.length} contacts`}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
      
      {contacts.length > 10 && (
        <div className="p-3 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground text-center">
            Showing first 10 rows • {contacts.length - 10} more contacts available
          </p>
        </div>
      )}
    </div>
  );
}
