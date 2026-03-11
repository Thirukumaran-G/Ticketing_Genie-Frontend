import { authClient } from '../../../lib/axios';
import {
  CompanyResponse,
  ProductResponse,
  TierResponse,
  SubscriptionResponse,
  AdminUserResponse,
} from '../../../types';

interface CompanyCreateRequest  { name: string; domain?: string; }
interface CompanyUpdateRequest  { name?: string; domain?: string; is_active?: boolean; }
interface ProductCreateRequest  { name: string; code: string; }
interface ProductUpdateRequest  { name?: string; is_active?: boolean; }
interface SubAssignRequest      { product_id: string; tier_id: string; }
interface SubUpdateRequest      { tier_id?: string; is_active?: boolean; }

export const adminAuthService = {
  // Companies
  listCompanies:    () =>
    authClient.get<CompanyResponse[]>('/admin/companies').then(r => r.data),
  getCompany:       (id: string) =>
    authClient.get<CompanyResponse>(`/admin/companies/${id}`).then(r => r.data),
  createCompany:    (p: CompanyCreateRequest) =>
    authClient.post<CompanyResponse>('/admin/companies', p).then(r => r.data),
  updateCompany:    (id: string, p: CompanyUpdateRequest) =>
    authClient.patch<CompanyResponse>(`/admin/companies/${id}`, p).then(r => r.data),

  // Products
  listProducts:     () =>
    authClient.get<ProductResponse[]>('/admin/products').then(r => r.data),
  createProduct:    (p: ProductCreateRequest) =>
    authClient.post<ProductResponse>('/admin/products', p).then(r => r.data),
  updateProduct:    (id: string, p: ProductUpdateRequest) =>
    authClient.patch<ProductResponse>(`/admin/products/${id}`, p).then(r => r.data),

  // Tiers
  listTiers:        () =>
    authClient.get<TierResponse[]>('/admin/tiers').then(r => r.data),

  // Subscriptions
  listSubscriptions: (companyId: string) =>
    authClient.get<SubscriptionResponse[]>(`/admin/companies/${companyId}/subscriptions`).then(r => r.data),
  assignSubscription: (companyId: string, p: SubAssignRequest) =>
    authClient.post<SubscriptionResponse>(`/admin/companies/${companyId}/subscriptions`, p).then(r => r.data),
  updateSubscription: (companyId: string, subId: string, p: SubUpdateRequest) =>
    authClient.patch<SubscriptionResponse>(`/admin/companies/${companyId}/subscriptions/${subId}`, p).then(r => r.data),

  // Users
  listUsers:        () =>
    authClient.get<AdminUserResponse[]>('/admin/users').then(r => r.data),
  deactivateUser:   (userId: string) =>
    authClient.patch(`/admin/users/${userId}/deactivate`).then(r => r.data),
};