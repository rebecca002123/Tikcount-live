import { Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

type Props = {
  views: string;
  likes: string;
  updated: string;
};

const TikCountWidget = (props: Props) => {
  'widget';
  return (
    <VStack modifiers={[containerBackground('#101014', 'widget')]}>
      <Text>TikCount Live</Text>
      <Text modifiers={[font({ size: 26, weight: 'bold' })]}>
        {props.views}
      </Text>
      <Text>TikTok views</Text>
      <Text>Likes: {props.likes}</Text>
      <Text>{props.updated}</Text>
    </VStack>
  );
};

export default createWidget('TikCountWidget', TikCountWidget, {
  views: '—',
  likes: '—',
  updated: 'Open TikCount Live'
});
