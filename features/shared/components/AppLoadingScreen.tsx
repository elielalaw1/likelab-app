import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg'

const BAR_WIDTH = 192

export function AppLoadingScreen() {
  const blob1 = useRef(new Animated.Value(0)).current
  const blob2 = useRef(new Animated.Value(0)).current
  const blob3 = useRef(new Animated.Value(0)).current
  const wordmark = useRef(new Animated.Value(0)).current
  const tagline = useRef(new Animated.Value(0)).current
  const loader = useRef(new Animated.Value(0)).current
  const decoLines = useRef(new Animated.Value(0)).current
  const progress = useRef(new Animated.Value(0)).current
  const shimmerX = useRef(new Animated.Value(-72)).current

  useEffect(() => {
    const blobAnim = (value: Animated.Value, delay: number) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 1200,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })

    Animated.parallel([
      blobAnim(blob1, 100),
      blobAnim(blob2, 250),
      blobAnim(blob3, 400),
      Animated.timing(wordmark, {
        toValue: 1,
        duration: 900,
        delay: 500,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(decoLines, {
        toValue: 1,
        duration: 1500,
        delay: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(tagline, {
        toValue: 1,
        duration: 700,
        delay: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(loader, {
        toValue: 1,
        duration: 700,
        delay: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start()

    Animated.sequence([
      Animated.delay(1400),
      Animated.timing(progress, {
        toValue: 0.75,
        duration: 1800,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 0.9,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(220),
      Animated.timing(progress, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start()

    const shimmerTimeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerX, {
            toValue: BAR_WIDTH + 72,
            duration: 2100,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerX, {
            toValue: -72,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }, 1400)

    return () => clearTimeout(shimmerTimeout)
  }, [blob1, blob2, blob3, decoLines, loader, progress, shimmerX, tagline, wordmark])

  const blobStyle = (value: Animated.Value) => ({
    opacity: value,
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }],
  })

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.blob, styles.blobOne, blobStyle(blob1)]} />
      <Animated.View style={[styles.blob, styles.blobTwo, blobStyle(blob2)]} />
      <Animated.View style={[styles.blob, styles.blobThree, blobStyle(blob3)]} />

      <Animated.View style={[styles.arcsWrap, { opacity: decoLines }]}>
        <Svg style={styles.arcs} viewBox="0 0 390 844" preserveAspectRatio="none">
          <Circle cx="390" cy="0" r="300" fill="none" stroke="rgba(180,160,255,0.08)" strokeWidth="1" />
          <Circle cx="390" cy="0" r="420" fill="none" stroke="rgba(180,160,255,0.06)" strokeWidth="1" />
          <Circle cx="0" cy="844" r="260" fill="none" stroke="rgba(255,180,210,0.07)" strokeWidth="1" />
          <Circle cx="0" cy="844" r="400" fill="none" stroke="rgba(255,180,210,0.05)" strokeWidth="1" />
        </Svg>
      </Animated.View>

      <View style={styles.grain} />

      <Animated.View
        style={[
          styles.wordmarkWrap,
          {
            opacity: wordmark,
            transform: [{ translateY: wordmark.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          },
        ]}>
        <Text style={styles.like}>Like</Text>
        <Svg width={250} height={94}>
          <Defs>
            <LinearGradient id="labGradient" x1="0%" y1="50%" x2="100%" y2="50%">
              <Stop offset="0%" stopColor="#9DCEF1" />
              <Stop offset="50%" stopColor="#A9B8F1" />
              <Stop offset="100%" stopColor="#BBA8F2" />
            </LinearGradient>
          </Defs>
          <SvgText
            x="0"
            y="82"
            fontSize="88"
            fontWeight="900"
            fontStyle="italic"
            letterSpacing="-3.96"
            fill="url(#labGradient)">
            lab
          </SvgText>
        </Svg>
      </Animated.View>

      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: tagline,
            transform: [{ translateY: tagline.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          },
        ]}>
        DISCOVER WHAT YOU LOVE
      </Animated.Text>

      <Animated.View
        style={[
          styles.loaderTrack,
          {
            opacity: loader,
            transform: [{ translateY: loader.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          },
        ]}>
        <Animated.View
          style={[
            styles.loaderFillMask,
          {
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-BAR_WIDTH / 2, 0] }) },
              { scaleX: progress },
            ],
          },
        ]}>
          <Svg width={BAR_WIDTH} height={3}>
            <Defs>
              <LinearGradient id="iridescent" x1="0%" y1="50%" x2="100%" y2="50%">
                <Stop offset="0%" stopColor="#B8A5F4" />
                <Stop offset="50%" stopColor="#C39AF0" />
                <Stop offset="100%" stopColor="#B8A5F4" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={BAR_WIDTH} height="3" rx="1.5" fill="url(#iridescent)" />
          </Svg>
        </Animated.View>
      <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobOne: {
    width: 420,
    height: 420,
    top: -150,
    left: -90,
    backgroundColor: 'rgba(203, 201, 244, 0.38)',
    shadowColor: '#c7bbff',
    shadowOpacity: 0.28,
    shadowRadius: 90,
  },
  blobTwo: {
    width: 360,
    height: 360,
    right: -100,
    top: -80,
    backgroundColor: 'rgba(219, 224, 248, 0.34)',
    shadowColor: '#d6d9f8',
    shadowOpacity: 0.24,
    shadowRadius: 84,
  },
  blobThree: {
    width: 420,
    height: 420,
    right: -120,
    bottom: -120,
    backgroundColor: 'rgba(241, 211, 240, 0.34)',
    shadowColor: '#edc8e5',
    shadowOpacity: 0.22,
    shadowRadius: 94,
  },
  arcsWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  arcs: {
    ...StyleSheet.absoluteFillObject,
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
    backgroundColor: 'rgba(32,30,40,0.02)',
  },
  wordmarkWrap: {
    position: 'absolute',
    top: '41.5%',
    left: '50%',
    width: 250,
    marginLeft: -125,
    alignItems: 'flex-start',
  },
  like: {
    fontSize: 88,
    lineHeight: 86,
    fontWeight: '900',
    letterSpacing: -3.96,
    color: '#0d0d0d',
    fontStyle: 'normal',
  },
  tagline: {
    position: 'absolute',
    bottom: 130,
    color: 'rgba(0,0,0,0.23)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3.2,
  },
  loaderTrack: {
    position: 'absolute',
    width: BAR_WIDTH,
    height: 3,
    bottom: 90,
    borderRadius: 999,
    backgroundColor: 'rgba(184,165,244,0.22)',
    overflow: 'hidden',
  },
  loaderFillMask: {
    width: BAR_WIDTH,
    height: 3,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: -72,
    width: 58,
    height: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.33)',
  },
})
