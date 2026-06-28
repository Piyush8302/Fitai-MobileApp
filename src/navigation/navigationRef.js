import { createNavigationContainerRef } from '@react-navigation/native';

// A ref so code outside the React tree (e.g. notification-tap handlers in App.js)
// can drive navigation.
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) navigationRef.navigate(name, params);
}

// Route to the right screen based on a tapped notification's data payload.
// New-member notifications carry { screen, gymId, membershipId }. Falls back to
// the user notifications list for anything without an explicit target.
export function routeFromNotificationData(data = {}) {
  if (!data || typeof data !== 'object') return;
  const screen = data.screen;
  try {
    if (screen === 'GymMemberDetail' && data.membershipId && data.gymId) {
      navigate('GymMemberDetail', { membershipId: data.membershipId, gymId: data.gymId });
    } else if (screen === 'MyGymCard') {
      navigate('MyGymCard');
    } else if (screen === 'GymAdmin') {
      navigate('AdminMain');
    } else if (screen) {
      navigate(screen, data);
    } else {
      navigate('Notifications', { scope: 'user' });
    }
  } catch (e) { /* navigator not ready / unknown screen — ignore */ }
}
