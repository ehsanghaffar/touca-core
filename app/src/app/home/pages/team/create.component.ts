/**
 * Copyright 2018-2020 Pejman Ghorbanzade. All rights reserved.
 */

import { Component, HostListener, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DialogRef } from '@ngneat/dialog';

import { formFields, FormHint, FormHints } from '@/core/models/form-hint';
import { ApiService } from '@/core/services';
import { ModalComponent } from '@/home/components';
import { AlertType } from '@/shared/components/alert.component';

type IFormContent = {
  name: string;
  slug: string;
};

@Component({
  templateUrl: './create.component.html'
})
export class TeamCreateSuiteComponent
  extends ModalComponent
  implements OnDestroy
{
  elements: { teamSlug: string };

  /**
   *
   */
  constructor(private apiService: ApiService, public dialogRef: DialogRef) {
    super();
    super.form = new FormGroup({
      name: new FormControl('', {
        validators: formFields.entityName.validators,
        updateOn: 'blur'
      }),
      slug: new FormControl('', {
        validators: formFields.entitySlug.validators,
        updateOn: 'blur'
      })
    });
    super.hints = new FormHints({
      name: new FormHint(
        'Short user-friendly name. Appears on Touca server and documents generated by it.',
        formFields.entityName.validationErrors
      ),
      slug: new FormHint(
        'Unique url-friendly identifier. Used in the links to your test results.',
        formFields.entitySlug.validationErrors
      )
    });
    super.subscribeHints(['name', 'slug']);
    this.elements = dialogRef.data as { teamSlug: string };
  }

  /**
   *
   */
  ngOnDestroy() {
    super.unsubscribeHints();
  }

  /**
   *
   */
  onSubmit(model: IFormContent) {
    if (!this.form.valid) {
      return;
    }
    this.submitted = true;
    const body = { name: model.name, slug: model.slug.toLocaleLowerCase() };
    const url = ['suite', this.elements.teamSlug].join('/');
    this.apiService.post(url, body).subscribe(
      () => {
        this.hints.reset();
        this.form.reset();
        this.submitted = false;
        this.dialogRef.close(true);
      },
      (err) => {
        const msg = this.apiService.extractError(err, [
          [400, 'request invalid', 'Your request was rejected by the server.'],
          [409, 'suite already registered', 'This suite is already registered.']
        ]);
        this.alert = { type: AlertType.Danger, text: msg };
      }
    );
  }

  /**
   *
   */
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    super.keydownGuard(['j', 'k', 'Enter', 'Backspace'], event);
  }
}
