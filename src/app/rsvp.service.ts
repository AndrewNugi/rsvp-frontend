import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface RSVPEntry {
  _id?: string;
  name: string;
  email: string;
  mobile_number: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface APIResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  errors?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RSVPService {
  private apiUrl = 'https://rsvp-backend-jq55.onrender.com/rsvps'; // Change this to your backend URL

  constructor(private http: HttpClient) { }

  // Get all RSVPs
  getAllRSVPs(): Observable<RSVPEntry[]> {
    return this.http.get<APIResponse<RSVPEntry[]>>(this.apiUrl)
      .pipe(
        map(response => response.data || []),
        catchError(this.handleError)
      );
  }

  // Create new RSVP
  createRSVP(rsvp: Omit<RSVPEntry, '_id' | 'created_at' | 'updated_at'>): Observable<RSVPEntry> {
    return this.http.post<APIResponse<RSVPEntry>>(this.apiUrl, rsvp)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to create RSVP');
        }),
        catchError(this.handleError)
      );
  }

  // Update RSVP
  updateRSVP(id: string, rsvp: Partial<RSVPEntry>): Observable<RSVPEntry> {
    return this.http.put<APIResponse<RSVPEntry>>(`${this.apiUrl}/${id}`, rsvp)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.message || 'Failed to update RSVP');
        }),
        catchError(this.handleError)
      );
  }

  // Delete RSVP
  deleteRSVP(id: string): Observable<boolean> {
    return this.http.delete<APIResponse<RSVPEntry>>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => response.success),
        catchError(this.handleError)
      );
  }

  // Delete all RSVPs
  deleteAllRSVPs(): Observable<{ success: boolean; deletedCount: number }> {
    return this.http.delete<APIResponse<any>>(this.apiUrl)
      .pipe(
        map(response => ({
          success: response.success,
          deletedCount: response.data?.deletedCount || 0
        })),
        catchError(this.handleError)
      );
  }

  // Get RSVP statistics
  getRSVPStats(): Observable<{ total: number; today: number }> {
    return this.http.get<APIResponse<{ total: number; today: number }>>(`${this.apiUrl}/stats`)
      .pipe(
        map(response => response.data || { total: 0, today: 0 }),
        catchError(this.handleError)
      );
  }

  // Check server health
  checkServerHealth(): Observable<boolean> {
    return this.http.get<{ status: string }>('https://rsvp-backend-jq55.onrender.com/health')
      .pipe(
        map(response => response.status === 'OK'),
        catchError(() => throwError(() => new Error('Server is not responding')))
      );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.error?.errors) {
        errorMessage = error.error.errors.join(', ');
      } else {
        errorMessage = `Server Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }

    console.error('RSVP Service Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}