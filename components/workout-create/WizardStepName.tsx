import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import {
  TEMPLATE_COLORS,
  WORKOUT_NAME_SUGGESTIONS,
} from '@/components/workout-create/exerciseData';
import { wizardStyles as s } from '@/components/workout-create/wizardStyles';

type Props = {
  templateName: string;
  templateColor: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onNext: () => void;
  footerPad: number;
};

export function WizardStepName({
  templateName,
  templateColor,
  onNameChange,
  onColorChange,
  onNext,
  footerPad,
}: Props) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    const q = templateName.trim().toLowerCase();
    if (!q) return WORKOUT_NAME_SUGGESTIONS;
    return WORKOUT_NAME_SUGGESTIONS.filter((n) => n.toLowerCase().includes(q));
  }, [templateName]);

  const canGoNext = templateName.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={s.stepBody}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.wizardQuestion}>What do you want to call this workout?</Text>

        <View style={s.searchWrapper}>
          <Search color="#666" size={18} style={{ marginLeft: 14 }} />
          <TextInput
            style={s.searchInput}
            placeholder="e.g. Push Day, Leg Day..."
            placeholderTextColor="#666"
            value={templateName}
            onChangeText={onNameChange}
            onFocus={() => setShowSuggestions(true)}
          />
          {templateName.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                onNameChange('');
                setShowSuggestions(false);
              }}
              style={{ marginRight: 12 }}
            >
              <X color="#666" size={18} />
            </TouchableOpacity>
          ) : null}
        </View>

        {showSuggestions && suggestions.length > 0 ? (
          <View style={s.suggestionList}>
            {suggestions.slice(0, 8).map((name) => (
              <TouchableOpacity
                key={name}
                style={s.suggestionItem}
                onPress={() => {
                  onNameChange(name);
                  setShowSuggestions(false);
                }}
              >
                <Text style={s.suggestionItemText}>{name}</Text>
              </TouchableOpacity>
            ))}
            {templateName.trim().length > 0 &&
            !suggestions.some((n) => n.toLowerCase() === templateName.trim().toLowerCase()) ? (
              <TouchableOpacity
                style={s.suggestionItem}
                onPress={() => setShowSuggestions(false)}
              >
                <Text style={s.suggestionCustomText}>Use "{templateName.trim()}"</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <Text style={[s.wizardQuestion, { marginTop: 32 }]}>Pick a color</Text>
        <View style={s.colorRow}>
          {TEMPLATE_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => onColorChange(c)}
              style={[s.colorDot, { backgroundColor: c }, templateColor === c && s.colorDotSelected]}
            />
          ))}
        </View>
      </ScrollView>

      <View style={[s.fixedFooter, { paddingBottom: footerPad }]}>
        <TouchableOpacity
          style={[s.wizardNextBtn, !canGoNext && { opacity: 0.4 }]}
          onPress={() => canGoNext && onNext()}
          disabled={!canGoNext}
          activeOpacity={0.8}
        >
          <Text style={s.wizardNextBtnText}>Next</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
