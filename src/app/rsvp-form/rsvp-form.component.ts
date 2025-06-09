import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RSVPService, RSVPEntry } from '../rsvp.service';

@Component({
  selector: 'app-rsvp-form',
  templateUrl: './rsvp-form.component.html',
  styleUrls: ['./rsvp-form.component.css']
})
export class RSVPFormComponent implements OnInit {
  rsvpForm: FormGroup;
  rsvpList: RSVPEntry[] = [];
  showPopup: boolean = true;
  isLoading: boolean = false;
  isSubmitting: boolean = false;
  serverConnected: boolean = false;
  errorMessage: string = '';
  designedErrorMessage = ''
  designedSuccessMessage = ''

  // Admin password protection
  private readonly adminPassword: string = 'neema2025'; 
  showPasswordPrompt: boolean = false;
  passwordInput: string = '';
  pendingAction: 'export' | 'clear' | null = null;

  constructor(
    private fb: FormBuilder,
    private rsvpService: RSVPService
  ) {
    this.rsvpForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      mobile_number: ['', [Validators.required, Validators.pattern(/^[+]?[\d\s\-\(\)]+$/)]]
    });
  }

  ngOnInit() {
    this.checkServerConnection();
    this.loadRSVPDataFromLocalStorage();
  }

  // Check if server is running
  checkServerConnection() {
    this.rsvpService.checkServerHealth().subscribe({
      next: (isHealthy) => {
        this.serverConnected = isHealthy;
        if (!isHealthy) {
          this.errorMessage = 'Server connection failed. Using offline mode.';
        } else {
          this.errorMessage = '';
          this.loadRSVPs(); 
        }
      },
      error: (error) => {
        console.error('Server health check failed:', error);
        this.serverConnected = false;
        this.errorMessage = 'Server is not available. Using offline mode.';
        this.loadRSVPDataFromLocalStorage(); // Fallback to localStorage
      }
    });
  }

  // Load RSVPs from database
  loadRSVPs() {
    if (!this.serverConnected) {
      return;
    }

    this.isLoading = true;
    this.rsvpService.getAllRSVPs().subscribe({
      next: (rsvps) => {
        this.rsvpList = rsvps;
        this.isLoading = false;
        this.errorMessage = '';
      },
      error: (error) => {
        console.error('Error loading RSVPs:', error);
        this.isLoading = false;
        this.errorMessage = 'Failed to load RSVP data from server.';
        // Fallback to localStorage if server fails
        this.loadRSVPDataFromLocalStorage();
      }
    });
  }

  // Add new RSVP
  addRSVP() {
    if (this.rsvpForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.errorMessage = '';

      const newEntry: Omit<RSVPEntry, '_id' | 'created_at' | 'updated_at'> = {
        name: this.rsvpForm.value.name.trim(),
        email: this.rsvpForm.value.email.trim().toLowerCase(),
        mobile_number: this.rsvpForm.value.mobile_number.trim()
      };

      if (this.serverConnected) {
        // Save to database
        this.rsvpService.createRSVP(newEntry).subscribe({
          next: (savedRSVP) => {
            this.rsvpList.unshift(savedRSVP); // Add to beginning of list
            this.rsvpForm.reset();
            this.isSubmitting = false;
            this.showTemporaryMessage('success', 'RSVP submitted successfully! 🎉');
          },
          error: (error) => {
            console.error('Error creating RSVP:', error);
            this.isSubmitting = false;

            if (error.message.includes('email already exists')) {
              this.showTemporaryMessage('error', 'This email has already been used for an RSVP. Please use a different email address.');
            } else {
              this.showTemporaryMessage('error', `Error submitting RSVP: ${error.message}`)
            }
          }
        });
      } else {
        // Fallback to localStorage
        const rsvpWithId = { ...newEntry, _id: this.generateTempId() };
        this.rsvpList.unshift(rsvpWithId);
        this.saveRSVPDataToLocalStorage();
        this.rsvpForm.reset();
        this.isSubmitting = false;
        console.log('RSVP saved locally (server unavailable). 📱');
      }
    } else {
      this.markFormGroupTouched(this.rsvpForm);
      this.showTemporaryMessage('error', 'Please fill in all required fields correctly!');
    }
  }

  // Add this method to your component class
  private showTemporaryMessage(type: 'success' | 'error', message: string) {
    if (type === 'success') {
      this.designedSuccessMessage = message;
      this.designedErrorMessage = '';
    } else {
      this.designedErrorMessage = message;
      this.designedSuccessMessage = '';
    }

    // Clear the message after 2 seconds
    setTimeout(() => {
      this.designedSuccessMessage = '';
      this.designedErrorMessage = '';
    }, 10000);
  }

  // Clear all RSVPs with password protection
  clearAllRSVPs() {
    if (this.rsvpList.length === 0) {
      this.showTemporaryMessage('error', 'No RSVPs to clear!');
      return;
    }

    this.requestAdminAccess('clear');
  }

  // Export to PDF with password protection
  exportToPDF() {
    if (this.rsvpList.length === 0) {
      this.showTemporaryMessage('error', 'No RSVP data to export!');
      return;
    }

    this.requestAdminAccess('export');
  }

  // Request admin access with password
  requestAdminAccess(action: 'export' | 'clear') {
    this.pendingAction = action;
    this.showPasswordPrompt = true;
    this.passwordInput = '';

    // Focus on password input after a brief delay
    setTimeout(() => {
      const passwordInput = document.getElementById('adminPassword') as HTMLInputElement;
      if (passwordInput) {
        passwordInput.focus();
      }
    }, 100);
  }

  // Verify admin password
  verifyPassword() {
    if (this.passwordInput === this.adminPassword) {
      this.showPasswordPrompt = false;
      this.passwordInput = '';

      if (this.pendingAction === 'export') {
        this.performExportToPDF();
      } else if (this.pendingAction === 'clear') {
        this.performClearAll();
      }

      this.pendingAction = null;
    } else {
      this.showTemporaryMessage('error', '❌ Incorrect password! Access denied.');
      this.passwordInput = '';
    }
  }

  // Cancel password prompt
  cancelPasswordPrompt() {
    this.showPasswordPrompt = false;
    this.passwordInput = '';
    this.pendingAction = null;
  }

  // Handle Enter key in password input
  onPasswordKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.verifyPassword();
    } else if (event.key === 'Escape') {
      this.cancelPasswordPrompt();
    }
  }

  // Perform the actual clear operation
  private performClearAll() {
    const confirmed = confirm(`🚨 ADMIN ACTION: Are you sure you want to clear all ${this.rsvpList.length} RSVP entries? This action cannot be undone.`);
    if (confirmed) {
      if (this.serverConnected) {
        // Clear from database
        this.rsvpService.deleteAllRSVPs().subscribe({
          next: (result) => {
            this.rsvpList = [];
            this.showTemporaryMessage('success', `✅ All RSVP entries have been cleared! (${result.deletedCount} records deleted)`);
          },
          error: (error) => {
            console.error('Error clearing RSVPs:', error);
            this.showTemporaryMessage('error', `❌ Error clearing RSVPs: ${error.message}`);
          }
        });
      } else {
        // Clear from localStorage
        this.rsvpList = [];
        this.saveRSVPDataToLocalStorage();
        this.showTemporaryMessage('success', '✅ All RSVP entries have been cleared from local storage!');
      }
    }
  }

  // Perform the actual export operation
  private performExportToPDF() {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(20);
      doc.text("Neema's Graduation RSVP List", 14, 22);

      // Add date and stats
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
      doc.text(`Total Members: ${this.rsvpList.length}`, 14, 40);
      // doc.text(`Exported by: Admin`, 14, 48);

      // if (this.serverConnected) {
      //   doc.text('Source: Database', 14, 56);
      // } else {
      //   doc.text('Source: Local Storage', 14, 56);
      // }

      // Prepare table data
      const tableColumn = ['#', 'Name', 'Email', 'Mobile Number', 'Arrived'];
      const tableRows: string[][] = [];

      this.rsvpList.forEach((entry, index) => {
        const dateAdded = entry.created_at
          ? new Date(entry.created_at).toLocaleDateString()
          : 'N/A';

        const rowData: string[] = [
          (index + 1).toString(),
          entry.name || '',
          entry.email || '',
          entry.mobile_number || '',
          ''
        ];
        tableRows.push(rowData);
      });

      // Add table using autoTable
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 66,
        styles: {
          fontSize: 9,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [255, 215, 0], // Green color
          textColor: [0, 0, 0]
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 10 }, // # column
          1: { cellWidth: 40 }, // Name column
          2: { cellWidth: 50 }, // Email column
          3: { cellWidth: 35 }, // Mobile column
          4: { cellWidth: 30 }  // Date column
        }
      });

      // Save the PDF
      const fileName = `neema-graduation-rsvp-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      this.showTemporaryMessage('success', `📄 PDF exported successfully as ${fileName}!`);

    } catch (error) {
      console.error('Error creating PDF:', error);
      this.showTemporaryMessage('error', '❌ Error creating PDF. Please try again later.');
    }
  }

  // Helper methods
  hasError(fieldName: string): boolean {
    const field = this.rsvpForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.rsvpForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldDisplayName(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['pattern']) {
        return 'Please enter a valid mobile number';
      }
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      'name': 'Name',
      'email': 'Email',
      'mobile_number': 'Mobile Number'
    };
    return fieldNames[fieldName] || fieldName;
  }

  closePopup() {
    this.showPopup = false;
  }

  // Mark all form controls as touched to show validation errors
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Generate temporary ID for offline mode
  private generateTempId(): string {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // LocalStorage fallback methods
  private saveRSVPDataToLocalStorage() {
    try {
      localStorage.setItem('rsvpData', JSON.stringify(this.rsvpList));
    } catch (error) {
      console.error('Error saving RSVP data to localStorage:', error);
    }
  }

  private loadRSVPDataFromLocalStorage() {
    try {
      const savedData = localStorage.getItem('rsvpData');
      if (savedData) {
        this.rsvpList = JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Error loading RSVP data from localStorage:', error);
      this.rsvpList = [];
    }
  }
}