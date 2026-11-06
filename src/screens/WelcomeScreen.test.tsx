import { fireEvent, render, screen } from '@testing-library/react-native';
import WelcomeScreen from './WelcomeScreen';

test('start and join buttons call their handlers', async () => {
  const onStartParty = jest.fn();
  const onJoinParty = jest.fn();
  await render(<WelcomeScreen onStartParty={onStartParty} onJoinParty={onJoinParty} />);

  await fireEvent.press(screen.getByText('Start a party'));
  await fireEvent.press(screen.getByText('Join a party'));

  expect(onStartParty).toHaveBeenCalledTimes(1);
  expect(onJoinParty).toHaveBeenCalledTimes(1);
});
