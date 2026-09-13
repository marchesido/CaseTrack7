import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Calcula a distância euclidiana entre dois pontos de toque
 */
function getEuclideanDistance(touch1, touch2) {
  const dx = touch1.pageX - touch2.pageX;
  const dy = touch1.pageY - touch2.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * ImageZoomModal
 * Visualizador imersivo em alta definição com pinch-to-zoom multiplataforma (iOS/Android/Web),
 * duplo toque, arraste delimitado, barra de controle flutuante e navegação de múltiplas fotos.
 */
export default function ImageZoomModal({
  visible,
  images = [],
  initialIndex = 0,
  onClose,
  title,
  subtitle,
}) {
  // Normaliza lista de imagens (aceita array de strings, array de objetos, ou imagem única)
  const normalizedImages = useMemo(() => {
    if (!images) return [];
    const list = Array.isArray(images) ? images : [images];
    return list
      .map((item) => {
        if (!item) return null;
        if (typeof item === 'string') {
          return { uri: item, title, subtitle };
        }
        return {
          uri: item.uri || item.imageUrl || item.url,
          title: item.title || title,
          subtitle: item.subtitle || subtitle,
        };
      })
      .filter((img) => Boolean(img?.uri));
  }, [images, title, subtitle]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [loadingImage, setLoadingImage] = useState(true);

  // Valores animados de transformação
  const scale = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Estado síncrono para cálculos do PanResponder e UI
  const currentScale = useRef(1);
  const currentPan = useRef({ x: 0, y: 0 });
  const [zoomPercent, setZoomPercent] = useState(100);

  // Controle de duplo toque e pinça
  const lastTapTime = useRef(0);
  const initialDistance = useRef(0);
  const scaleAtPinchStart = useRef(1);

  // Sincroniza estado de escala e pan com Animated.Value listeners
  useEffect(() => {
    const scaleSub = scale.addListener(({ value }) => {
      currentScale.current = value;
      setZoomPercent(Math.round(value * 100));
    });
    const panSub = pan.addListener((value) => {
      currentPan.current = value;
    });

    return () => {
      scale.removeListener(scaleSub);
      pan.removeListener(panSub);
    };
  }, [scale, pan]);

  // Reseta transformações para 1.0x e (0,0)
  const resetTransform = useCallback(
    (animated = true) => {
      if (animated) {
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: false,
            friction: 7,
          }),
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 7,
          }),
        ]).start();
      } else {
        scale.setValue(1);
        pan.setValue({ x: 0, y: 0 });
      }
    },
    [scale, pan],
  );

  // Reseta sempre que a visibilidade ou índice mudar
  useEffect(() => {
    if (visible) {
      setCurrentIndex(
        Math.min(Math.max(0, initialIndex || 0), Math.max(0, normalizedImages.length - 1)),
      );
      resetTransform(false);
      setLoadingImage(true);
    }
  }, [visible, initialIndex, normalizedImages.length, resetTransform]);

  // Altera zoom animadamente
  const animateToScale = useCallback(
    (targetScale) => {
      const clamped = Math.min(Math.max(targetScale, 1), 4);
      if (clamped === 1) {
        resetTransform(true);
        return;
      }
      Animated.spring(scale, {
        toValue: clamped,
        useNativeDriver: false,
        friction: 6,
      }).start();
    },
    [scale, resetTransform],
  );

  // Duplo toque (1x <-> 2.5x)
  const handleDoubleTap = useCallback(() => {
    if (currentScale.current > 1.2) {
      resetTransform(true);
    } else {
      animateToScale(2.5);
    }
  }, [resetTransform, animateToScale]);

  // Configuração do PanResponder com distância euclidiana
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { touches } = evt.nativeEvent;
        const now = Date.now();

        // Detecção de Duplo Toque (<= 300ms)
        if (touches.length === 1) {
          if (now - lastTapTime.current < 300) {
            handleDoubleTap();
            lastTapTime.current = 0;
            return;
          }
          lastTapTime.current = now;
        }

        // Início do Pinch com 2 toques
        if (touches.length === 2) {
          initialDistance.current = getEuclideanDistance(touches[0], touches[1]);
          scaleAtPinchStart.current = currentScale.current;
        }

        // Configura offset para arraste contínuo
        pan.setOffset({
          x: currentPan.current.x,
          y: currentPan.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: (evt, gestureState) => {
        const { touches } = evt.nativeEvent;

        // 2 Toques: Gesto de Pinch-to-Zoom euclidiano
        if (touches.length === 2 && initialDistance.current > 0) {
          const currentDistance = getEuclideanDistance(touches[0], touches[1]);
          const distanceDelta = currentDistance / initialDistance.current;
          const newScale = Math.min(Math.max(scaleAtPinchStart.current * distanceDelta, 0.9), 4.2);
          scale.setValue(newScale);
          return;
        }

        // 1 Toque: Arraste (Pan) delimitado aos limites da imagem ampliada
        if (touches.length === 1 && currentScale.current > 1.05) {
          const s = currentScale.current;
          const maxTranslateX = ((s - 1) * SCREEN_WIDTH) / 2;
          const maxTranslateY = ((s - 1) * (SCREEN_HEIGHT * 0.7)) / 2;

          const proposedX = currentPan.current.x + gestureState.dx;
          const proposedY = currentPan.current.y + gestureState.dy;

          // Clamping para manter a imagem no campo visual
          const clampedX = Math.min(Math.max(proposedX, -maxTranslateX), maxTranslateX);
          const clampedY = Math.min(Math.max(proposedY, -maxTranslateY), maxTranslateY);

          pan.x.setValue(clampedX - currentPan.current.x);
          pan.y.setValue(clampedY - currentPan.current.y);
        }
      },

      onPanResponderRelease: () => {
        pan.flattenOffset();

        // Se escala ficou abaixo de 1.0 (efeito mola de saída de pinch), reseta
        if (currentScale.current < 1) {
          resetTransform(true);
        } else if (currentScale.current > 4) {
          animateToScale(4);
        }
      },
    }),
  ).current;

  if (!visible || normalizedImages.length === 0) {
    return null;
  }

  const currentImage = normalizedImages[currentIndex] || normalizedImages[0];
  const hasMultiple = normalizedImages.length > 1;

  const handleNext = () => {
    if (currentIndex < normalizedImages.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      resetTransform(false);
      setLoadingImage(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      resetTransform(false);
      setLoadingImage(true);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Cabeçalho do Modal */}
        <View style={styles.header}>
          <View style={styles.titleWrapper}>
            <Text style={styles.title} numberOfLines={1}>
              {currentImage?.title || 'Visualização em Alta Resolução'}
            </Text>
            {currentImage?.subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {currentImage.subtitle}
              </Text>
            ) : null}
            {hasMultiple && (
              <Text style={styles.pageIndicator}>
                Foto {currentIndex + 1} de {normalizedImages.length}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeText}>✕ Fechar</Text>
          </TouchableOpacity>
        </View>

        {/* Container da Imagem com Gestos */}
        <View style={styles.imageViewport} {...panResponder.panHandlers}>
          {loadingImage && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          )}

          <Animated.Image
            source={{ uri: currentImage.uri }}
            style={[
              styles.image,
              {
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y },
                  { scale: scale },
                ],
              },
            ]}
            resizeMode="contain"
            onLoad={() => setLoadingImage(false)}
            onError={() => setLoadingImage(false)}
          />

          {/* Setas de Navegação de Múltiplas Fotos */}
          {hasMultiple && currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.navArrow, styles.navArrowLeft]}
              onPress={handlePrev}
              activeOpacity={0.8}
            >
              <Text style={styles.navArrowText}>‹</Text>
            </TouchableOpacity>
          )}

          {hasMultiple && currentIndex < normalizedImages.length - 1 && (
            <TouchableOpacity
              style={[styles.navArrow, styles.navArrowRight]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.navArrowText}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Barra de Ferramentas Inferior Flutuante (Paridade Web / Desktop / Mobile) */}
        <View style={styles.floatingToolbar}>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => animateToScale(currentScale.current - 0.5)}
            activeOpacity={0.7}
          >
            <Text style={styles.toolBtnText}>−</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => resetTransform(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.resetBtnText}>{zoomPercent}% • Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => animateToScale(currentScale.current + 0.5)}
            activeOpacity={0.7}
          >
            <Text style={styles.toolBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hintText}>
          {Platform.OS === 'web'
            ? 'Clique nos botões de zoom ou dê duplo clique na imagem'
            : 'Faça gesto de pinça, arraste para inspecionar ou dê duplo toque'}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 10,
  },
  titleWrapper: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  pageIndicator: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  imageViewport: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.72,
  },
  loadingBox: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  navArrowLeft: {
    left: 16,
  },
  navArrowRight: {
    right: 16,
  },
  navArrowText: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '300',
  },
  floatingToolbar: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
    zIndex: 10,
  },
  toolBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  toolBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  resetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1E3A8A',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  hintText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 11,
    marginTop: 6,
  },
});
