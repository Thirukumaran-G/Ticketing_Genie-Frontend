// src/features/admin/hooks/useAdminCompanies.ts
import { useEffect, useState, useCallback } from 'react';
import { adminAuthService } from '../services/adminAuthService';
import { CompanyResponse, TierResponse, ProductResponse, SubscriptionResponse } from '../../../types';

export const useAdminCompanies = () => {
  const [companies, setCompanies]       = useState<CompanyResponse[]>([]);
  const [tiers, setTiers]               = useState<TierResponse[]>([]);
  const [products, setProducts]         = useState<ProductResponse[]>([]);
  const [selectedCompany, setSelected]  = useState<CompanyResponse | null>(null);
  const [subs, setSubs]                 = useState<SubscriptionResponse[]>([]);
  const [loading, setLoading]           = useState(true);

  const loadCompanies = useCallback(() =>
    adminAuthService.listCompanies().then(setCompanies).finally(() => setLoading(false)), []);

  useEffect(() => {
    loadCompanies();
    adminAuthService.listTiers().then(setTiers);
    adminAuthService.listProducts().then(setProducts);
  }, [loadCompanies]);

  const selectCompany = useCallback((c: CompanyResponse) => {
    setSelected(c);
    adminAuthService.listSubscriptions(c.id).then(setSubs);
  }, []);

  const toggleCompany = useCallback(async (c: CompanyResponse) => {
    await adminAuthService.updateCompany(c.id, { is_active: !c.is_active });
    loadCompanies();
  }, [loadCompanies]);

  const createCompany = useCallback(async (d: { name: string; domain: string }) => {
    await adminAuthService.createCompany(d);
    loadCompanies();
  }, [loadCompanies]);

  const assignSubscription = useCallback(async (companyId: string, d: { product_id: string; tier_id: string }) => {
    await adminAuthService.assignSubscription(companyId, d);
    if (selectedCompany?.id === companyId) {
      adminAuthService.listSubscriptions(companyId).then(setSubs);
    }
  }, [selectedCompany]);

  return { companies, tiers, products, selectedCompany, subs, loading, loadCompanies, selectCompany, toggleCompany, createCompany, assignSubscription, setSelected };
};
