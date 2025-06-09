import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Required for reactive forms
import { CommonModule } from '@angular/common'; // Required for *ngFor and *ngIf
import { AgGridModule } from 'ag-grid-angular';

import { AppComponent } from './app.component';
import { RSVPFormComponent } from './rsvp-form/rsvp-form.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    AppComponent,
    RSVPFormComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    CommonModule,
    HttpClientModule, // Required for HTTP requests
    AppRoutingModule,
    AgGridModule,
    FormsModule, 
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }