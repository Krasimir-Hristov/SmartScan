export interface StarterTopicConfig {
  id: string;
  chipKey:
    | 'starterHeatingChip'
    | 'starterTrashChip'
    | 'starterParkingChip'
    | 'starterDiningChip'
    | 'starterRulesChip'
    | 'starterPetsChip'
    | 'starterGeneralChip';
  titleKey:
    | 'starterHeatingTitle'
    | 'starterTrashTitle'
    | 'starterParkingTitle'
    | 'starterDiningTitle'
    | 'starterRulesTitle'
    | 'starterPetsTitle'
    | 'starterGeneralTitle';
  category: 'rules' | 'appliances' | 'parking' | 'recommendations' | 'general' | 'pets';
  placeholderKey:
    | 'starterHeatingPlaceholder'
    | 'starterTrashPlaceholder'
    | 'starterParkingPlaceholder'
    | 'starterDiningPlaceholder'
    | 'starterRulesPlaceholder'
    | 'starterPetsPlaceholder'
    | 'starterGeneralPlaceholder';
}

export const STARTER_TOPICS: StarterTopicConfig[] = [
  {
    id: 'heating',
    chipKey: 'starterHeatingChip',
    titleKey: 'starterHeatingTitle',
    category: 'appliances',
    placeholderKey: 'starterHeatingPlaceholder',
  },
  {
    id: 'trash',
    chipKey: 'starterTrashChip',
    titleKey: 'starterTrashTitle',
    category: 'general',
    placeholderKey: 'starterTrashPlaceholder',
  },
  {
    id: 'parking',
    chipKey: 'starterParkingChip',
    titleKey: 'starterParkingTitle',
    category: 'parking',
    placeholderKey: 'starterParkingPlaceholder',
  },
  {
    id: 'dining',
    chipKey: 'starterDiningChip',
    titleKey: 'starterDiningTitle',
    category: 'recommendations',
    placeholderKey: 'starterDiningPlaceholder',
  },
  {
    id: 'rules',
    chipKey: 'starterRulesChip',
    titleKey: 'starterRulesTitle',
    category: 'rules',
    placeholderKey: 'starterRulesPlaceholder',
  },
  {
    id: 'pets',
    chipKey: 'starterPetsChip',
    titleKey: 'starterPetsTitle',
    category: 'pets',
    placeholderKey: 'starterPetsPlaceholder',
  },
  {
    id: 'general',
    chipKey: 'starterGeneralChip',
    titleKey: 'starterGeneralTitle',
    category: 'general',
    placeholderKey: 'starterGeneralPlaceholder',
  },
];


