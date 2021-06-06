/**
 * Copyright 2018-2020 Pejman Ghorbanzade. All rights reserved.
 */

import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DialogModule } from '@ngneat/dialog';
import { ClipboardModule } from 'ngx-clipboard';

import {
  AlertComponent,
  FooterComponent,
  HeaderInsideComponent,
  HeaderOutsideComponent,
  NotificationComponent,
  ServerDownComponent
} from './components';
import { AutofocusDirective, DropdownDirective } from './directives';
import { DateTimePipe } from './pipes';

@NgModule({
  imports: [
    ClipboardModule,
    CommonModule,
    FontAwesomeModule,
    FormsModule,
    HttpClientModule,
    DialogModule.forRoot(),
    ReactiveFormsModule,
    RouterModule
  ],
  declarations: [
    AlertComponent,
    AutofocusDirective,
    DateTimePipe,
    DropdownDirective,
    FooterComponent,
    HeaderInsideComponent,
    HeaderOutsideComponent,
    NotificationComponent,
    ServerDownComponent
  ],
  exports: [
    AlertComponent,
    AutofocusDirective,
    ClipboardModule,
    CommonModule,
    DateTimePipe,
    DialogModule,
    DropdownDirective,
    FontAwesomeModule,
    FooterComponent,
    FormsModule,
    HeaderInsideComponent,
    HeaderOutsideComponent,
    HttpClientModule,
    NotificationComponent,
    ReactiveFormsModule,
    ServerDownComponent
  ]
})
export class SharedModule {}
