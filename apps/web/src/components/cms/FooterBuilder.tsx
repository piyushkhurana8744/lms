'use client';

import React from 'react';
import { FooterEditor, FooterEditorProps } from './FooterEditor';

export function FooterBuilder(props: FooterEditorProps) {
  return <FooterEditor {...props} />;
}

export { FooterEditor };
