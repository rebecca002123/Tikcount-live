import { Text, VStack, HStack, Spacer, ProgressView } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

type Props = {
  videoId: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  updated: string;
};

const TikCountWidget = (props: Props) => {
  'widget';

  const views = Number(props.views.replace(/[^0-9]/g, '')) || 0;
  const goal = (Math.floor(views / 500000) + 1) * 500000;
  const progress = views / goal;

  return (
    <VStack spacing={5} modifiers={[
      containerBackground('#090D14', 'widget')
    ]}>
      <HStack>
        <Text modifiers={[
          font({ size: 12, weight: 'bold' }),
          foregroundStyle('#22D3EE')
        ]}>TikCount Live</Text>
        <Spacer />
        <Text modifiers={[
          font({ size: 9 }),
          foregroundStyle('#22D3EE')
        ]}>TRACKING</Text>
      </HStack>

      <Text modifiers={[
        font({ size: 10 }),
        foregroundStyle('#94A3B8')
      ]}>TOTAL VIEWS</Text>

      <Text modifiers={[
        font({ size: 30, weight: 'bold' }),
        foregroundStyle('#FFFFFF')
      ]}>{props.views}</Text>

      <HStack spacing={10}>
        <VStack>
          <Text modifiers={[font({ size: 10 }), foregroundStyle('#94A3B8')]}>Likes</Text>
          <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>{props.likes}</Text>
        </VStack>
        <Spacer />
        <VStack>
          <Text modifiers={[font({ size: 10 }), foregroundStyle('#94A3B8')]}>Comments</Text>
          <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>{props.comments || '—'}</Text>
        </VStack>
        <Spacer />
        <VStack>
          <Text modifiers={[font({ size: 10 }), foregroundStyle('#94A3B8')]}>Shares</Text>
          <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>{props.shares || '—'}</Text>
        </VStack>
      </HStack>

      <Text modifiers={[
        font({ size: 10, weight: 'bold' }),
        foregroundStyle('#22D3EE')
      ]}>{'NEXT GOAL: ' + goal.toLocaleString('en-GB')}</Text>

      <ProgressView value={progress} />

      <Text modifiers={[
        font({ size: 10 }),
        foregroundStyle('#94A3B8')
      ]}>{(goal - views).toLocaleString('en-GB') + ' views remaining'}</Text>
    </VStack>
  );
};

export default createWidget('TikCountWidget', TikCountWidget, {
  videoId: '',
  comments: '—',
  shares: '—',
  views: '—',
  likes: '—',
  updated: 'Open TikCount Live'
});
