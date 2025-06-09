import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RSVPFormComponent } from './rsvp-form/rsvp-form.component';

const routes: Routes = [
  { path: '', redirectTo: '/rsvp', pathMatch: 'full' },
  { path: 'rsvp', component: RSVPFormComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
