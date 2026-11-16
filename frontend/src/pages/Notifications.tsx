import { NotificationList } from '../components/NotificationList';
import { Screen } from '../components/Layout';
import { Sheet } from '../components/ui';
import { useI18n } from '../i18n';

export default function Notifications() {
  const { t } = useI18n();
  return (
    <Screen back title={t('n.title')}>
      <Sheet flush><NotificationList /></Sheet>
    </Screen>
  );
}
