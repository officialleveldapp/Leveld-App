import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X } from 'lucide-react-native';
import {
  ALL_EXERCISES,
  COMMON_EXERCISES,
  type ExerciseSearchResult,
} from '@/components/workout-create/exerciseData';
import { wizardStyles as s } from '@/components/workout-create/wizardStyles';

type Props = {
  visible: boolean;
  addedNames: Set<string>;
  onAdd: (name: string) => void;
  onClose: () => void;
};

export function ExercisePickerModal({ visible, addedNames, onAdd, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const results = useMemo((): ExerciseSearchResult[] => {
    if (categoryFilter) {
      const cat = COMMON_EXERCISES.find((c) => c.category === categoryFilter);
      if (!cat) return [];
      const q = query.trim().toLowerCase();
      const list = cat.exercises.map((name) => ({ name, category: cat.category }));
      if (!q) return list;
      return list.filter((e) => e.name.toLowerCase().includes(q));
    }
    const q = query.trim().toLowerCase();
    if (!q) return ALL_EXERCISES.slice(0, 40);
    return ALL_EXERCISES.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 30);
  }, [query, categoryFilter]);

  const showCustomRow =
    query.trim().length > 0 &&
    !results.some((e) => e.name.toLowerCase() === query.trim().toLowerCase());

  const handleClose = () => {
    setQuery('');
    setCategoryFilter(null);
    onClose();
  };

  const handleAdd = (name: string) => {
    onAdd(name);
    setQuery('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[s.pickerOverlay, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.pickerHeader}>
          <Text style={s.pickerTitle}>Add exercise</Text>
          <TouchableOpacity onPress={handleClose} style={s.pickerDoneBtn} hitSlop={8}>
            <Text style={s.pickerDoneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={s.pickerSearchSection}>
          <View style={s.searchWrapper}>
            <Search color="#666" size={18} style={{ marginLeft: 14 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor="#666"
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                if (text.trim()) setCategoryFilter(null);
              }}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} style={{ marginRight: 12 }}>
                <X color="#666" size={18} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {!query.trim() ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.categoryPillsScroll}
            style={s.categoryPillsContainer}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={[s.categoryPill, !categoryFilter && { borderColor: '#4C91FF' }]}
              onPress={() => setCategoryFilter(null)}
            >
              <Text style={s.categoryPillText}>All</Text>
            </TouchableOpacity>
            {COMMON_EXERCISES.map((cat) => (
              <TouchableOpacity
                key={cat.category}
                style={[s.categoryPill, categoryFilter === cat.category && { borderColor: '#4C91FF' }]}
                onPress={() => setCategoryFilter(cat.category)}
              >
                <Text style={s.categoryPillText}>{cat.category}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <FlatList
          data={results}
          keyExtractor={(item, idx) => `${item.name}-${idx}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          ListFooterComponent={
            showCustomRow ? (
              <TouchableOpacity
                style={[s.pickerResultItem, s.pickerCustomRow]}
                onPress={() => handleAdd(query.trim())}
              >
                <Text style={s.pickerCustomText}>+ Add "{query.trim()}"</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => {
            const alreadyAdded = addedNames.has(item.name.toLowerCase());
            return (
              <TouchableOpacity
                style={s.pickerResultItem}
                onPress={() => !alreadyAdded && handleAdd(item.name)}
                activeOpacity={alreadyAdded ? 1 : 0.7}
              >
                <Text style={[s.pickerResultName, alreadyAdded && { color: '#666' }]}>{item.name}</Text>
                {alreadyAdded ? (
                  <Text style={s.pickerAddedBadge}>Added</Text>
                ) : (
                  <Text style={s.pickerResultCategory}>{item.category}</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
