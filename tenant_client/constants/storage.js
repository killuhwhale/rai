import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY  = 'OIDC_REFRESH_TOKEN';
const ACCESS_KEY   = 'OIDC_ACCESS_TOKEN';
const ID_KEY       = 'OIDC_ID_TOKEN';
const PROVIDER_KEY = 'OIDC_PROVIDER';

async function webGet(key) {
  return Promise.resolve(localStorage.getItem(key));
}
async function webSet(key, value) {
  if (value == null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
}

async function nativeGet(key) {
  return SecureStore.getItemAsync(key);
}
async function nativeSet(key, value) {
  if (value == null) return SecureStore.deleteItemAsync(key);
  return SecureStore.setItemAsync(key, value);
}

export async function getRefreshToken() {
  return Platform.OS === 'web'
    ? webGet(REFRESH_KEY)
    : nativeGet(REFRESH_KEY);
}
export async function setRefreshToken(token) {
  return Platform.OS === 'web'
    ? webSet(REFRESH_KEY, token)
    : nativeSet(REFRESH_KEY, token);
}
export async function removeRefreshToken() {
  return setRefreshToken(null);
}

export async function getAccessToken() {
  return Platform.OS === 'web'
    ? webGet(ACCESS_KEY)
    : nativeGet(ACCESS_KEY);
}
export async function setAccessToken(token) {
  return Platform.OS === 'web'
    ? webSet(ACCESS_KEY, token)
    : nativeSet(ACCESS_KEY, token);
}
export async function removeAccessToken() {
  return setAccessToken(null);
}

export async function getIdToken() {
  return Platform.OS === 'web'
    ? webGet(ID_KEY)
    : nativeGet(ID_KEY);
}
export async function setIdToken(token) {
  return Platform.OS === 'web'
    ? webSet(ID_KEY, token)
    : nativeSet(ID_KEY, token);
}
export async function removeIdToken() {
  return setIdToken(null);
}

export async function getProvider() {
  return Platform.OS === 'web'
    ? webGet(PROVIDER_KEY)
    : nativeGet(PROVIDER_KEY);
}
export async function setProvider(provider) {
  return Platform.OS === 'web'
    ? webSet(PROVIDER_KEY, provider)
    : nativeSet(PROVIDER_KEY, provider);
}
export async function removeProvider() {
  return setProvider(null);
}
