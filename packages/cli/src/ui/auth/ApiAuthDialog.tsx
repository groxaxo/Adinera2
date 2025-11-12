/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { TextInput } from '../components/shared/TextInput.js';
import { useTextBuffer } from '../components/shared/text-buffer.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { AuthType } from '@google/gemini-cli-core';

interface ApiAuthDialogProps {
  onSubmit: (apiKey: string) => void;
  onCancel: () => void;
  error?: string | null;
  defaultValue?: string;
}

export function ApiAuthDialog({
  onSubmit,
  onCancel,
  error,
  defaultValue = '',
}: ApiAuthDialogProps): React.JSX.Element {
  const { mainAreaWidth } = useUIState();
  const settings = useSettings();
  const viewportWidth = mainAreaWidth - 8;

  const selectedAuthType = settings.merged.security?.auth?.selectedType;
  const isOpenAI = selectedAuthType === AuthType.USE_OPENAI;

  const buffer = useTextBuffer({
    initialText: defaultValue || '',
    initialCursorOffset: defaultValue?.length || 0,
    viewport: {
      width: viewportWidth,
      height: 4,
    },
    isValidPath: () => false, // No path validation needed for API key
    inputFilter: (text) =>
      text.replace(/[^a-zA-Z0-9_-]/g, '').replace(/[\r\n]/g, ''),
    singleLine: true,
  });

  const handleSubmit = (value: string) => {
    onSubmit(value);
  };

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.focused}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold color={theme.text.primary}>
        {isOpenAI ? 'Enter OpenAI API Key' : 'Enter Gemini API Key'}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.text.primary}>
          {isOpenAI
            ? 'Please enter your OpenAI API key. You can also set OPENAI_BASE_URL environment variable to use custom endpoints.'
            : 'Please enter your Gemini API key. It will be securely stored in your system keychain.'}
        </Text>
        <Text color={theme.text.secondary}>
          {isOpenAI ? (
            <>
              You can get an API key from{' '}
              <Text color={theme.text.link}>
                https://platform.openai.com/api-keys
              </Text>
            </>
          ) : (
            <>
              You can get an API key from{' '}
              <Text color={theme.text.link}>
                https://aistudio.google.com/app/apikey
              </Text>
            </>
          )}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="row">
        <Box
          borderStyle="round"
          borderColor={theme.border.default}
          paddingX={1}
          flexGrow={1}
        >
          <TextInput
            buffer={buffer}
            onSubmit={handleSubmit}
            onCancel={onCancel}
            placeholder="Paste your API key here"
          />
        </Box>
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color={theme.status.error}>{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>
          (Press Enter to submit, Esc to cancel)
        </Text>
      </Box>
    </Box>
  );
}
