import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { AppHeading } from '@/components/app-heading'
import { FeatureCard } from '@/components/feature-card'
import { ScreenShell } from '@/components/screen-shell'
import { colors, spacing } from '@/theme/tokens'

export default function HomeScreen() {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeading eyebrow="Mobile Foundation" title="Zeማa for iPhone and Android">
          We are starting with the core mobile shell first: discovery, reviews, lists, profile, and auth will land on top of this foundation.
        </AppHeading>

        <FeatureCard title="What comes next">
          Auth session persistence, release detail, review flows, and the first production-ready bottom-tab experience.
        </FeatureCard>

        <FeatureCard title="Shared backend">
          This mobile app will reuse the existing Express API and the same product rules the web app already follows.
        </FeatureCard>

        <View style={styles.badges}>
          {['Rate', 'Review', 'Log', 'List', 'Like'].map((item) => (
            <View key={item} style={styles.badge}>
              <Text style={styles.badgeText}>{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  badgeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
})
