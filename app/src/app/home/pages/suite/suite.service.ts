// Copyright 2021 Touca, Inc. Subject to Apache-2.0 License.

import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { isEqual } from 'lodash-es';
import { forkJoin, Observable, of, Subject } from 'rxjs';

import type {
  BatchListResponse,
  ElementListResponse,
  SuiteItem,
  SuiteLookupResponse,
  TeamLookupResponse
} from '@/core/models/commontypes';
import { EFeatureFlag } from '@/core/models/commontypes';
import { FrontendBatchItem } from '@/core/models/frontendtypes';
import {
  AlertKind,
  AlertService,
  ApiService,
  UserService
} from '@/core/services';
import { PageTab } from '@/home/components';
import { IPageService } from '@/home/models/pages.model';
import { errorLogger } from '@/shared/utils/errorLogger';

import { SuitePageItem, SuitePageItemType } from './suite.model';

export enum SuitePageTabType {
  Versions = 'versions',
  Testcases = 'testcases',
  Settings = 'settings'
}

export enum SuiteBannerType {
  SuiteNotFound = 'not-found'
}

type FetchInput = {
  currentTab: string;
  teamSlug: string;
  suiteSlug: string;
};

const availableTabs: Record<SuitePageTabType, PageTab<SuitePageTabType>> = {
  [SuitePageTabType.Versions]: {
    type: SuitePageTabType.Versions,
    name: 'Versions',
    link: 'versions',
    icon: 'feather-list',
    shown: true
  },
  [SuitePageTabType.Testcases]: {
    type: SuitePageTabType.Testcases,
    name: 'Test Cases',
    link: 'testcases',
    icon: 'feather-file-text',
    shown: true
  },
  [SuitePageTabType.Settings]: {
    type: SuitePageTabType.Settings,
    name: 'Settings',
    link: 'settings',
    icon: 'feather-settings',
    shown: true
  }
};

@Injectable()
export class SuitePageService extends IPageService<SuitePageItem> {
  private _bannerSubject = new Subject<SuiteBannerType>();
  banner$ = this._bannerSubject.asObservable();

  private _cache: {
    tabs: PageTab<SuitePageTabType>[];
    team: TeamLookupResponse;
    suites: SuiteItem[];
    suite: SuiteLookupResponse;
    batches: BatchListResponse;
    elements: ElementListResponse;
  } = {
    tabs: undefined,
    team: undefined,
    suites: undefined,
    suite: undefined,
    batches: undefined,
    elements: undefined
  };

  private _subjects = {
    tabs: new Subject<PageTab<SuitePageTabType>[]>(),
    team: new Subject<TeamLookupResponse>(),
    suites: new Subject<SuiteItem[]>(),
    suite: new Subject<SuiteLookupResponse>(),
    batches: new Subject<BatchListResponse>(),
    elements: new Subject<ElementListResponse>()
  };

  data = {
    tabs$: this._subjects.tabs.asObservable(),
    team$: this._subjects.team.asObservable(),
    suites$: this._subjects.suites.asObservable(),
    suite$: this._subjects.suite.asObservable(),
    batches$: this._subjects.batches.asObservable(),
    elements$: this._subjects.elements.asObservable()
  };

  constructor(
    private alertService: AlertService,
    private apiService: ApiService,
    private userService: UserService
  ) {
    super();
  }

  public fetchItems(args: FetchInput): void {
    const url = [
      ['team', args.teamSlug],
      ['suite', args.teamSlug],
      ['suite', args.teamSlug, args.suiteSlug],
      ['batch', args.teamSlug, args.suiteSlug],
      ['element', 'v2', args.teamSlug, args.suiteSlug]
    ];
    const update = (key: string, response: unknown) => {
      if (response && !isEqual(response, this._cache[key])) {
        this._cache[key] = response;
        this._subjects[key].next(response);
      }
    };
    const elements = ['team', 'suites', 'suite', 'batches', 'elements'];
    const requests = elements.map((key, index) => {
      return this._cache[key]
        ? of(0)
        : this.apiService.get<unknown>(url[index].join('/'));
    });
    // ensure that we always periodically poll list of versions
    if (args.currentTab == SuitePageTabType.Versions) {
      requests[3] = this.apiService.get<unknown>(url[3].join('/'));
    }
    forkJoin(requests).subscribe({
      next: (doc) => {
        elements.forEach((key, index) => update(key, doc[index]));
        const tabs: PageTab<SuitePageTabType>[] = [
          {
            ...availableTabs.versions,
            counter: this._cache.batches.length
          }
        ];
        if (
          this.userService.currentUser?.feature_flags.includes(
            EFeatureFlag.TestcasesTab
          )
        ) {
          tabs.push({
            ...availableTabs.testcases,
            counter: this._cache.elements.length
          });
        }
        tabs.push(availableTabs.settings);
        update('tabs', tabs);
        this.alertService.unset(
          AlertKind.ApiConnectionDown,
          AlertKind.ApiConnectionLost,
          AlertKind.TeamNotFound,
          AlertKind.SuiteNotFound
        );
        const items = this._cache.batches
          .map((v) => {
            const batch = v as FrontendBatchItem;
            batch.isBaseline =
              batch.batchSlug === this._cache.suite.baseline?.batchSlug;
            return new SuitePageItem(batch, SuitePageItemType.Batch);
          })
          .sort(SuitePageItem.compareByDate);
        if (isEqual(this._items, items)) {
          return;
        }
        this._items = items;
        this._itemsSubject.next(this._items);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 0) {
          this.alertService.set(
            !this._items
              ? AlertKind.ApiConnectionDown
              : AlertKind.ApiConnectionLost
          );
        } else if (err.status === 401) {
          this.alertService.set(AlertKind.InvalidAuthToken);
        } else if (err.status === 404) {
          this.alertService.set(AlertKind.SuiteNotFound);
        } else {
          errorLogger.notify(err);
        }
      }
    });
  }

  /**
   * Updates new information to all components of the suite page in the event
   * that the suite slug changes during the lifetime of this page.
   *
   * Team slug may change in two cases:
   *  - User switches to another suite
   *  - User updates slug of this suite
   */
  public updateSuiteSlug(
    currentTab: SuitePageTabType,
    suiteSlug: string
  ): void {
    const teamSlug = this._cache.suite.teamSlug;
    this._cache.suites = null;
    this._cache.suite = null;
    this._cache.batches = null;
    this._cache.elements = null;
    this.fetchItems({ currentTab, teamSlug, suiteSlug });
  }

  public updateSubscription(
    action: 'subscribe' | 'unsubscribe'
  ): Observable<void> {
    const url = [
      'suite',
      this._cache.suite.teamSlug,
      this._cache.suite.suiteSlug,
      action
    ].join('/');
    return this.apiService.post(url);
  }
}
