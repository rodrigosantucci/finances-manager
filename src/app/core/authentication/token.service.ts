import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, share, timer } from 'rxjs';

import { LocalStorageService, SessionStorageService } from '@shared';
import { currentTimestamp, filterObject, base64 } from './helpers';
import { Token } from './interface';
import { BaseToken } from './token';
import { TokenFactory } from './token-factory.service';

@Injectable({
  providedIn: 'root',
})
export class TokenService implements OnDestroy {
  private readonly key = 'app-token';

  private readonly store = inject(LocalStorageService);
  private readonly sessionStore = inject(SessionStorageService);
  private readonly factory = inject(TokenFactory);

  private readonly change$ = new BehaviorSubject<BaseToken | undefined>(undefined);
  private readonly refresh$ = new Subject<BaseToken | undefined>();

  private timer$?: Subscription;

  private _token?: BaseToken;

  private get token(): BaseToken | undefined {
    if (!this._token) {
      let tokenData = this.store.get(this.key);
      if (!tokenData || Object.keys(tokenData).length === 0) {
        tokenData = this.sessionStore.get(this.key);
      }
      this._token = this.factory.create(tokenData);
    }

    return this._token;
  }

  change() {
    return this.change$.pipe(share());
  }

  refresh() {
    this.buildRefresh();

    return this.refresh$.pipe(share());
  }

  set(token?: Token, rememberMe = true) {
    this.save(token, rememberMe);

    return this;
  }

  clear() {
    this.save();
  }

  valid() {
    return this.token?.valid() ?? false;
  }

  getBearerToken() {
    return this.token?.getBearerToken() ?? '';
  }

  getRefreshToken() {
    return this.token?.refresh_token;
  }

  getUserId(): number | undefined {
    const accessToken = this.token?.access_token;
    if (accessToken) {
      try {
        const payload = JSON.parse(base64.decode(accessToken.split('.')[1]));
        const userIdCandidate = payload.sub || payload.userId;
        const userId = Number(userIdCandidate); // Attempt to convert to number
        if (!isNaN(userId)) { // Check if the conversion resulted in a valid number
          return userId;
        } else {
          console.warn('TokenService: User ID in JWT payload is not a valid number:', userIdCandidate);
        }
      } catch (e) {
        console.error('Error decoding access token:', e);
      }
    }
    return undefined;
  }

  ngOnDestroy(): void {
    this.clearRefresh();
  }

  private save(token?: Token, rememberMe = true) {
    this._token = undefined;

    if (!token) {
      this.store.remove(this.key);
      this.sessionStore.remove(this.key);
    } else {
      const value = Object.assign({ access_token: '', token_type: 'Bearer' }, token, {
        exp: token.expires_in ? currentTimestamp() + token.expires_in : null,
      });
      const filteredValue = filterObject(value);

      if (rememberMe) {
        this.store.set(this.key, filteredValue);
        this.sessionStore.remove(this.key);
      } else {
        this.sessionStore.set(this.key, filteredValue);
        this.store.remove(this.key);
      }
    }

    this.change$.next(this.token);
    this.buildRefresh();
  }

  private buildRefresh() {
    this.clearRefresh();

    if (this.token?.needRefresh()) {
      this.timer$ = timer(this.token.getRefreshTime() * 1000).subscribe(() => {
        this.refresh$.next(this.token);
      });
    }
  }

  private clearRefresh() {
    if (this.timer$ && !this.timer$.closed) {
      this.timer$.unsubscribe();
    }
  }
}
