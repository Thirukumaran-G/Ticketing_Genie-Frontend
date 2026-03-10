// src/features/admin/services/adminAuthService.ts
// Auth-service admin routes: /admin/companies, /admin/products, /admin/tiers, /admin/users
import { authClient } from '../../../lib/axios';
import {
  CompanyResponse,
  ProductResponse,
  TierResponse,
  SubscriptionResponse,
  AdminUserResponse,
} from '../../../types';

interface CompanyCreateRequest { name: string; domain: string; }
interface CompanyUpdateRequest { name?: string; is_active?: boolean; }
interface ProductCreateRequest { name: string; }
interface ProductUpdateRequest { name?: string; is_active?: boolean; }
interface SubscriptionAssignRequest { product_id: string; tier_id: string; }
interface SubscriptionUpdateRequest { tier_id?: string; is_active?: boolean; }

export const adminAuthService = {
  // Companies
  listCompanies: () =>
    authClient.get<CompanyResponse[]>('/admin/companies').then(r => r.data),
  getCompany: (id: string) =>
    authClient.get<CompanyResponse>(`/admin/companies/${id}`).then(r => r.data),
  createCompany: (payload: CompanyCreateRequest) =>
    authClient.post<CompanyResponse>('/admin/companies', payload).then(r => r.data),
  updateCompany: (id: string, payload: CompanyUpdateRequest) =>
    authClient.patch<CompanyResponse>(`/admin/companies/${id}`, payload).then(r => r.data),

  // Products
  listProducts: () =>
    authClient.get<ProductResponse[]>('/admin/products').then(r => r.data),
  createProduct: (payload: ProductCreateRequest) =>
    authClient.post<ProductResponse>('/admin/products', payload).then(r => r.data),
  updateProduct: (id: string, payload: ProductUpdateRequest) =>
    authClient.patch<ProductResponse>(`/admin/products/${id}`, payload).then(r => r.data),

  // Tiers
  listTiers: () =>
    authClient.get<TierResponse[]>('/admin/tiers').then(r => r.data),

  // Subscriptions
  listSubscriptions: (companyId: string) =>
    authClient.get<SubscriptionResponse[]>(`/admin/companies/${companyId}/subscriptions`).then(r => r.data),
  assignSubscription: (companyId: string, payload: SubscriptionAssignRequest) =>
    authClient.post<SubscriptionResponse>(`/admin/companies/${companyId}/subscriptions`, payload).then(r => r.data),
  updateSubscription: (companyId: string, subId: string, payload: SubscriptionUpdateRequest) =>
    authClient.patch<SubscriptionResponse>(`/admin/companies/${companyId}/subscriptions/${subId}`, payload).then(r => r.data),

  // Users
  listUsers: () =>
    authClient.get<AdminUserResponse[]>('/admin/users').then(r => r.data),
  deactivateUser: (userId: string) =>
    authClient.patch(`/admin/users/${userId}/deactivate`).then(r => r.data),
};
