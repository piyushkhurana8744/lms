'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminOrganizationWebsitePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/cms');
  }, [router]);

  return null;
}
