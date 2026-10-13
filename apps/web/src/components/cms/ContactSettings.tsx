'use client';

import React from 'react';
import { ContactEditor, ContactEditorProps } from './ContactEditor';

export function ContactSettings(props: ContactEditorProps) {
  return <ContactEditor {...props} />;
}

export { ContactEditor };
