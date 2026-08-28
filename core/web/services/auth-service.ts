/**
 * Browser OIDC client wrapper around `oidc-client-ts` {@link UserManager}.
 *
 * Persists OIDC protocol state in `localStorage`, surfaces sign-in / sign-out flows
 * (redirect vs popup), and completes redirects via `finishSignIn` / `finishSignOut`
 * when the IdP sends the user back with query parameters (`code`, `state`, or
 * `error`).
 *
 * Example usage:
 * const auth = new AuthService({ authority: 'https://idp', client_id: 'my', redirect_uri: 'https://app/cb' });
 * await auth.startSignIn();
 * // On redirect callback route
 * await auth.finishSignIn();
 */
import type { User, UserManagerSettings } from 'oidc-client-ts';
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

/** How `startSignIn` opens the IdP (`Redirect` vs `Popup`). */
export const LOGIN_TYPES = {
  Redirect: 0,
  Popup: 1,
} as const;

/**
 * True when the current browser URL contains OIDC callback parameters.
 *
 * Checks for the presence of `code` or `error` plus `state` in the query
 * string. This is used by `finishSignIn` to determine whether the current
 * navigation is an IdP redirect that must be completed.
 */
function hasOIDParams() {
  if (!window || !window.location || !window.location.search) {
    return false;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get('code') || params.get('error')) && params.get('state');
  } catch (_e) {
    return false;
  }
}

export default class AuthService {
  /** Underlying OIDC library client (immutable after construction). */
  client: UserManager;
  login_type: number;

  /**
   * @param settings - Passed to {@link UserManager}; `userStore` is pinned to browser `localStorage` when `window` exists
   */
  constructor(settings: UserManagerSettings) {
    if (window) settings.userStore = new WebStorageStateStore({ store: window.localStorage });
    this.client = new UserManager(settings);
    Object.defineProperty(this, 'client', { writable: false });

    this.client.events.addUserSignedIn(() => {
      console.debug('SIGN IN');
    });

    this.client.events.addUserLoaded((_u: User) => {
      // triggered when user session is loaded
      // this could be due to a login or page refresh
      // and state is restored.
      console.debug('---- user loaded');
      // maybe emit an event that the UI can capture
      // to set User data/state?
    });

    this.client.events.addUserUnloaded(() => {
      // u should be "undefined" here
      console.debug('---- user unloaded');
    });

    this.login_type = LOGIN_TYPES.Redirect;
  }

  /** Drops incomplete or stale OIDC state from persisted storage (`clearStaleState`). */
  async clean() {
    return await this.client.clearStaleState();
  }

  /**
   * Returns the signed-in {@link User} when non-expired, otherwise clears an expired profile and resolves `null`.
   */
  async getUser() {
    // clean stale and incomplete sessions
    await this.clean();
    const user = await this.client.getUser();

    // return user if it exists and is not expired
    if (user && !user.expired) return user;
    // remove the current user if it exists but is expired
    if (user) await this.client.removeUser();

    return null; // no valid user exists in storage
  }

  /** Starts OIDC interactive login (popup or redirect per {@link LOGIN_TYPES}). */
  async startSignIn() {
    if (this.login_type === LOGIN_TYPES.Popup) return await this.client.signinPopup();
    return await this.client.signinRedirect();
  }

  /**
   * Completes the OIDC authorization response when query params include `code`/`state` (or errors);
   * no-ops otherwise. Required so the persisted user session materializes after redirect back.
   */
  async finishSignIn() {
    if (hasOIDParams()) {
      return await this.client.signinCallback();
    }
    return null;
  }

  /** End-session at the IdP and clear local OIDC profile via redirect (`signoutRedirect`). */
  async signOut() {
    return await this.client.signoutRedirect();
  }

  /** Handles IdP logout redirect landing page (`signoutCallback`). */
  async finishSignOut() {
    this.client
      .signoutCallback()
      .then(function () {
        // noop
      })
      .catch(function (err) {
        console.error('signout callback: error', err);
      });
  }
}
