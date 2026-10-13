export type TitleType = 'Filme' | 'Série';
export type AccessType = 'subscription' | 'rent' | 'buy';
export interface Availability { service: string; access: AccessType; price?: string; color: string; }
export interface CatalogTitle { id: string; title: string; type: TitleType; year: number; duration: string; genres: string[]; synopsis: string; poster: string; backdrop: string; cast?: string[]; availability: Availability[]; featured?: boolean; trending?: boolean; comingSoon?: boolean; }
