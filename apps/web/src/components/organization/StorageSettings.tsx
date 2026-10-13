'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IOrganizationStorageResponse, StorageProvider } from '@edtech/types';
import { StorageConnectionStatus } from './StorageConnectionStatus';
import { StorageProviderDialog } from './StorageProviderDialog';
import { useGlobalError } from '@/components/error/useGlobalError';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { FormSkeleton } from '@/components/loading/SkeletonLoaders';
import { Loader2 } from 'lucide-react';

export function StorageSettings() {
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();
  const { confirm } = useConfirmation();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Query storage settings
  const { data: storageData, isLoading, isError, error } = useQuery<IOrganizationStorageResponse>({
    queryKey: ['organization-storage-settings'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/settings/storage');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to fetch storage settings');
      }
      const json = await res.json();
      return json.data;
    }
  });

  // Test Connection Mutation
  const testMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/v1/organization/settings/storage/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Storage connection test failed');
      return json.data;
    },
    onError: (err: Error) => {
      showError({ title: 'Storage Test Failed', message: err.message });
    }
  });

  // Save Configuration Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/v1/organization/settings/storage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save storage configuration');
      return json.data;
    },
    onSuccess: (updatedData) => {
      queryClient.setQueryData(['organization-storage-settings'], updatedData);
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
    },
    onError: (err: Error) => {
      showError({ title: 'Save Configuration Failed', message: err.message });
    }
  });

  // Disconnect Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/settings/storage', {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to disconnect storage provider');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-storage-settings'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
    },
    onError: (err: Error) => {
      showError({ title: 'Disconnect Failed', message: err.message });
    }
  });

  const handleTestConnection = async (payload: any): Promise<boolean> => {
    try {
      await testMutation.mutateAsync(payload);
      return true;
    } catch {
      return false;
    }
  };

  const handleSaveConfiguration = async (payload: any) => {
    // If switching provider from an existing configured provider, confirm with user
    if (storageData?.provider && storageData.provider !== payload.provider) {
      const isConfirmed = await confirm({
        title: 'Switch Storage Provider?',
        description: `You are about to switch your organization storage provider from ${storageData.provider} to ${payload.provider}. Future uploads will use ${payload.provider}.`,
        confirmText: 'Yes, Switch Provider',
        type: 'danger'
      });
      if (!isConfirmed) return;
    }

    await saveMutation.mutateAsync(payload);
  };

  const handleDisconnect = async () => {
    const isConfirmed = await confirm({
      title: 'Disconnect Storage Provider?',
      description: 'Are you sure you want to disconnect your organization storage provider? Media upload functionality will be suspended until a provider is configured.',
      confirmText: 'Disconnect Provider',
      type: 'danger'
    });

    if (isConfirmed) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  const activeProvider = storageData?.provider;
  const status = storageData?.status || 'NOT_CONFIGURED';

  const bucketName = storageData?.r2?.bucket || storageData?.s3?.bucket;
  const region = storageData?.s3?.region;
  const cloudName = storageData?.cloudinary?.cloudName;

  return (
    <div className="space-y-4">
      <StorageConnectionStatus
        provider={activeProvider}
        status={status}
        bucketName={bucketName}
        region={region}
        cloudName={cloudName}
        lastTestedAt={storageData?.lastTestedAt || undefined}
        lastError={storageData?.lastError || undefined}
        isTestPending={testMutation.isPending}
        onOpenConfigure={() => setIsModalOpen(true)}
        onTestConnection={() =>
          storageData &&
          handleTestConnection({
            provider: storageData.provider,
            r2: storageData.r2,
            s3: storageData.s3,
            cloudinary: storageData.cloudinary
          })
        }
        onDisconnect={handleDisconnect}
      />

      <StorageProviderDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={storageData}
        onTestConnection={handleTestConnection}
        onSaveConfiguration={handleSaveConfiguration}
        isTestPending={testMutation.isPending}
        isSavePending={saveMutation.isPending}
      />
    </div>
  );
}
