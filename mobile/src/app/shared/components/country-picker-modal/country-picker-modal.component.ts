import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  ModalController,
} from '@ionic/angular/standalone';

export interface Country {
  name: string;
  code: string; // ISO 2
  dialCode: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
];

@Component({
  selector: 'app-country-picker-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-title>Select Country</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar color="primary">
        <ion-searchbar
          [value]="searchQuery()"
          (ionInput)="onSearch($event)"
          placeholder="Search country or code..."
          class="custom-search"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-top">
      <ion-list lines="full">
        @for (country of filteredCountries(); track country.code) {
          <ion-item button (click)="selectCountry(country)" class="country-item">
            <span slot="start" class="flag-icon">{{ country.flag }}</span>
            <ion-label>
              <h2>{{ country.name }}</h2>
            </ion-label>
            <ion-note slot="end" class="dial-code">{{ country.dialCode }}</ion-note>
          </ion-item>
        } @empty {
          <div class="empty-state">
            <p>No countries found</p>
          </div>
        }
      </ion-list>
    </ion-content>
  `,
  styles: [`
    .flag-icon {
      font-size: 1.6rem;
      margin-right: 12px;
    }
    .dial-code {
      font-weight: 600;
      color: var(--ion-color-primary);
      font-size: 0.95rem;
    }
    .country-item {
      --padding-start: 16px;
      --padding-end: 16px;
    }
    .empty-state {
      text-align: center;
      padding: 32px;
      color: var(--ichat-text-secondary);
    }
  `],
})
export class CountryPickerModalComponent implements OnInit {
  searchQuery = signal<string>('');
  filteredCountries = signal<Country[]>(COUNTRIES);

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {}

  onSearch(event: any) {
    const query = (event.target.value || '').toLowerCase().trim();
    this.searchQuery.set(query);
    if (!query) {
      this.filteredCountries.set(COUNTRIES);
    } else {
      const filtered = COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.dialCode.includes(query) ||
          c.code.toLowerCase().includes(query),
      );
      this.filteredCountries.set(filtered);
    }
  }

  selectCountry(country: Country) {
    this.modalCtrl.dismiss(country);
  }

  close() {
    this.modalCtrl.dismiss(null);
  }
}
