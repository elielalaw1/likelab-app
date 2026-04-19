import { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, Alert } from 'react-native';
import { registerForPushNotificationsAsync, sendPushNotification } from '@/features/notifications/push';

export default function PushTestScreen() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await registerForPushNotificationsAsync();
      setExpoPushToken(token);
    })();
  }, []);

  const handleSend = (type: string) => {
    if (!expoPushToken) {
      Alert.alert('Ingen push-token', 'Testa på en fysisk enhet och tillåt notiser.');
      return;
    }
    let title = '';
    let body = '';
    switch (type) {
      case 'accepted':
        title = 'Du har blivit accepterad!';
        body = 'Grattis, du är nu med i kampanjen.';
        break;
      case 'new':
        title = 'Ny kampanj!';
        body = 'Det har precis kommit in en ny kampanj.';
        break;
      case 'rejected':
        title = 'Du blev inte vald';
        body = 'Tyvärr, du blev inte accepterad till kampanjen.';
        break;
      case 'annoy':
        title = 'Kom tillbaka!';
        body = 'Vi saknar dig – öppna LikeLab igen!';
        break;
      default:
        title = 'Testnotis';
        body = 'Detta är en testnotis.';
    }
    sendPushNotification(expoPushToken, title, body);
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 18, marginBottom: 16 }}>Pushnotis-test</Text>
      <Text selectable style={{ marginBottom: 24 }}>Token: {expoPushToken || 'Ingen token'}</Text>
      <Button title="Accepterad till kampanj" onPress={() => handleSend('accepted')} />
      <View style={{ height: 12 }} />
      <Button title="Ny kampanj" onPress={() => handleSend('new')} />
      <View style={{ height: 12 }} />
      <Button title="Rejected från kampanj" onPress={() => handleSend('rejected')} />
      <View style={{ height: 12 }} />
      <Button title="Jobbig notis" onPress={() => handleSend('annoy')} />
    </ScrollView>
  );
}
