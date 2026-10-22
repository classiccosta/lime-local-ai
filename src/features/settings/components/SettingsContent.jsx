import { EndpointField } from '@/features/settings/components/EndpointField';
import { LanguageSwitch } from '@/features/settings/components/LanguageSwitch';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { SettingValue } from '@/features/settings/components/SettingValue';
import { useT } from '@/i18n/context';
import { useState } from 'react';

/**
 * The settings dialog's body. One column, both providers: a tab per provider
 * hid half of what could be picked at any moment.
 *
 * `models` is the picker as an element, passed in by App so settings doesn't
 * import from the models feature.
 */
export function SettingsContent({ models, endpoint, endpointStatus }) {
  const t = useT();
  // Once an endpoint has answered with models, its list replaces the field; this
  // brings the field back to point somewhere else.
  const [editingEndpoint, setEditingEndpoint] = useState(false);

  // A failing endpoint always shows the field, where its error is.
  const editEndpoint =
    editingEndpoint || endpointStatus.modelCount === 0 || Boolean(endpointStatus.error);

  const loadFromEndpoint = (url) => {
    endpointStatus.load(url);
    setEditingEndpoint(false);
  };

  return (
    <>
      <SettingsSection title={t('settings.models')}>{models}</SettingsSection>

      {/* The field carries its own "Endpoint" label, so the title is only
          drawn over the plain value. */}
      <SettingsSection title={editEndpoint ? undefined : t('settings.endpointTitle')}>
        {editEndpoint ? (
          <EndpointField
            endpoint={endpoint}
            onLoad={loadFromEndpoint}
            fetching={endpointStatus.fetching}
            error={endpointStatus.error}
            modelCount={endpointStatus.modelCount}
          />
        ) : (
          <SettingValue
            value={endpoint}
            changeLabel={t('settings.changeEndpoint')}
            onChange={() => setEditingEndpoint(true)}
          />
        )}
      </SettingsSection>

      <LanguageSwitch />
    </>
  );
}
