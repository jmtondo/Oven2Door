import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonContent, IonIcon, IonSpinner } from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  personOutline,
  mailOutline,
  callOutline,
  saveOutline,
  shieldCheckmarkOutline,
  locationOutline,
  addOutline,
  createOutline,
  trashOutline,
  homeOutline,
  checkmarkCircleOutline,
  closeOutline,
} from 'ionicons/icons';

import { Router } from '@angular/router';

import { auth, db } from '../../firebase.config';

import { onAuthStateChanged, updateProfile, Unsubscribe } from 'firebase/auth';

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';

// SHIPPING ADDRESS MODEL
export interface ShippingAddress {
  id?: string;
  label: string;
  address: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonSpinner],
})
export class ProfilePage implements OnInit, OnDestroy {
  // PERSONAL INFORMATION
  firstName = '';
  lastName = '';
  email = '';
  phone = '';

  loading = true;
  saving = false;
  editing = false;

  errorMessage = '';
  successMessage = '';

  // SHIPPING ADDRESSES
  addresses: ShippingAddress[] = [];

  addressesLoading = false;
  addressSaving = false;

  showAddressForm = false;
  editingAddressId: string | null = null;

  addressError = '';
  addressSuccess = '';

  addressForm: ShippingAddress = this.emptyAddress();

  private authUnsubscribe?: Unsubscribe;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({
      personOutline,
      mailOutline,
      callOutline,
      saveOutline,
      shieldCheckmarkOutline,
      locationOutline,
      addOutline,
      createOutline,
      trashOutline,
      homeOutline,
      checkmarkCircleOutline,
      closeOutline,
    });
  }

  // =====================================
  // INITIALIZATION
  // =====================================

  ngOnInit(): void {
    this.authUnsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          this.loading = false;
          this.errorMessage = 'Please log in to view your profile.';

          this.cdr.detectChanges();

          await this.router.navigateByUrl('/login', {
            replaceUrl: true,
          });

          return;
        }

        await this.loadProfile(user.uid);

        if (!this.errorMessage) {
          await this.loadAddresses();
        }
      },
      (error) => {
        console.error('Profile auth error:', error);

        this.loading = false;
        this.errorMessage = 'Unable to verify your login session.';

        this.cdr.detectChanges();
      },
    );
  }

  // =====================================
  // LOAD PERSONAL PROFILE
  // =====================================

  async loadProfile(uid: string): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const snapshot = await getDoc(doc(db, 'users', uid));

      if (!snapshot.exists()) {
        this.errorMessage = 'Your profile could not be found.';
        return;
      }

      const data = snapshot.data();

      if (data['role'] !== 'customer' || data['status'] !== 'active') {
        this.errorMessage = 'Your customer profile is unavailable.';
        return;
      }

      this.firstName = data['firstName'] || '';
      this.lastName = data['lastName'] || '';
      this.email = auth.currentUser?.email || data['email'] || '';

      this.phone = data['phone'] || '';
    } catch (error) {
      console.error('Profile loading error:', error);

      this.errorMessage = 'Unable to load your profile.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // =====================================
  // SAVE PERSONAL PROFILE
  // =====================================

  async saveProfile(): Promise<void> {
    if (this.saving) return;

    const user = auth.currentUser;

    if (!user) {
      await this.router.navigateByUrl('/login');
      return;
    }

    const firstName = this.firstName.trim();
    const lastName = this.lastName.trim();
    const phone = this.phone.trim();

    if (!firstName || !lastName || !phone) {
      this.errorMessage = 'Please complete all required fields.';

      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName,
        phone,
        updatedAt: serverTimestamp(),
      });

      this.firstName = firstName;
      this.lastName = lastName;
      this.phone = phone;

      this.editing = false;

      this.successMessage = 'Profile updated successfully!';

      try {
        await updateProfile(user, {
          displayName: `${firstName} ${lastName}`,
        });
      } catch (authError) {
        console.warn('Firebase Auth name sync failed:', authError);
      }
    } catch (error) {
      console.error('Profile update error:', error);

      this.errorMessage = 'Unable to save your changes.';
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  async cancelEdit(): Promise<void> {
    this.editing = false;
    this.successMessage = '';

    const uid = auth.currentUser?.uid;

    if (uid) {
      await this.loadProfile(uid);
    }
  }

  // =====================================
  // ADDRESS HELPERS
  // =====================================

  private emptyAddress(): ShippingAddress {
    return {
      label: 'Home',
      address: '',
      barangay: '',
      city: '',
      province: '',
      postalCode: '',
      isDefault: false,
    };
  }

  private getAddressCollection() {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      throw new Error('Customer is not authenticated.');
    }

    return collection(db, 'users', uid, 'addresses');
  }

  // =====================================
  // LOAD SHIPPING ADDRESSES
  // =====================================

  async loadAddresses(): Promise<void> {
    this.addressesLoading = true;
    this.addressError = '';

    try {
      const snapshot = await getDocs(this.getAddressCollection());

      this.addresses = snapshot.docs.map((document) => ({
        ...(document.data() as ShippingAddress),
        id: document.id,
      }));

      // Default address first
      this.addresses.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    } catch (error) {
      console.error('Address loading error:', error);

      this.addressError = 'Unable to load shipping addresses.';
    } finally {
      this.addressesLoading = false;
      this.cdr.detectChanges();
    }
  }

  // =====================================
  // OPEN ADD ADDRESS FORM
  // =====================================

  addNewAddress(): void {
    this.editingAddressId = null;
    this.addressForm = this.emptyAddress();

    this.showAddressForm = true;

    this.addressError = '';
    this.addressSuccess = '';
  }

  // =====================================
  // EDIT EXISTING ADDRESS
  // =====================================

  editAddress(address: ShippingAddress): void {
    this.editingAddressId = address.id || null;

    this.addressForm = {
      ...address,
    };

    this.showAddressForm = true;

    this.addressError = '';
    this.addressSuccess = '';
  }

  // =====================================
  // CANCEL ADDRESS FORM
  // =====================================

  cancelAddressForm(): void {
    this.showAddressForm = false;
    this.editingAddressId = null;

    this.addressForm = this.emptyAddress();

    this.addressError = '';
  }

  // =====================================
  // SAVE SHIPPING ADDRESS
  // =====================================

  async saveAddress(): Promise<void> {
    if (this.addressSaving) return;

    const form = this.addressForm;

    if (
      !form.label.trim() ||
      !form.address.trim() ||
      !form.barangay.trim() ||
      !form.city.trim() ||
      !form.province.trim() ||
      !form.postalCode.trim()
    ) {
      this.addressError = 'Please complete all address fields.';

      this.cdr.detectChanges();
      return;
    }

    this.addressSaving = true;
    this.addressError = '';
    this.addressSuccess = '';

    this.cdr.detectChanges();

    try {
      const addressCollection = this.getAddressCollection();

      const snapshot = await getDocs(addressCollection);

      const isFirstAddress = snapshot.empty && !this.editingAddressId;

      const shouldBeDefault = isFirstAddress || form.isDefault;

      const addressData = {
        label: form.label.trim(),
        address: form.address.trim(),
        barangay: form.barangay.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        postalCode: form.postalCode.trim(),
        isDefault: shouldBeDefault,
        updatedAt: serverTimestamp(),
      };

      if (this.editingAddressId) {
        // Update existing address
        const addressRef = doc(addressCollection, this.editingAddressId);

        const batch = writeBatch(db);

        if (shouldBeDefault) {
          snapshot.docs.forEach((item) => {
            if (item.id !== this.editingAddressId) {
              batch.update(item.ref, {
                isDefault: false,
              });
            }
          });
        }

        batch.update(addressRef, addressData);
        await batch.commit();

        this.addressSuccess = 'Shipping address updated successfully!';
      } else if (shouldBeDefault) {
        // Add a default address atomically with
        // updates to the previous default.
        const newRef = doc(addressCollection);
        const batch = writeBatch(db);

        snapshot.docs.forEach((item) => {
          batch.update(item.ref, {
            isDefault: false,
          });
        });

        batch.set(newRef, {
          ...addressData,
          createdAt: serverTimestamp(),
        });

        await batch.commit();

        this.addressSuccess = 'Shipping address added successfully!';
      } else {
        // Add another non-default address
        await addDoc(addressCollection, {
          ...addressData,
          createdAt: serverTimestamp(),
        });

        this.addressSuccess = 'Shipping address added successfully!';
      }

      this.showAddressForm = false;
      this.editingAddressId = null;

      this.addressForm = this.emptyAddress();

      await this.loadAddresses();
    } catch (error) {
      console.error('Save address error:', error);

      this.addressError = 'Unable to save shipping address.';
    } finally {
      this.addressSaving = false;
      this.cdr.detectChanges();
    }
  }

  // =====================================
  // SET DEFAULT ADDRESS
  // =====================================

  async setDefaultAddress(address: ShippingAddress): Promise<void> {
    if (!address.id || address.isDefault) {
      return;
    }

    this.addressError = '';
    this.addressSuccess = '';

    try {
      const addressCollection = this.getAddressCollection();

      const snapshot = await getDocs(addressCollection);

      const batch = writeBatch(db);

      snapshot.docs.forEach((item) => {
        batch.update(item.ref, {
          isDefault: item.id === address.id,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();

      this.addressSuccess = 'Default shipping address updated!';

      await this.loadAddresses();
    } catch (error) {
      console.error('Default address error:', error);

      this.addressError = 'Unable to update default address.';

      this.cdr.detectChanges();
    }
  }

  // =====================================
  // DELETE SHIPPING ADDRESS
  // =====================================

  async removeAddress(address: ShippingAddress): Promise<void> {
    if (!address.id) return;

    const confirmed = window.confirm(`Delete your ${address.label} address?`);

    if (!confirmed) return;

    this.addressError = '';
    this.addressSuccess = '';

    try {
      const addressCollection = this.getAddressCollection();

      const addressRef = doc(addressCollection, address.id);

      if (address.isDefault) {
        const snapshot = await getDocs(addressCollection);

        const remaining = snapshot.docs.filter(
          (item) => item.id !== address.id,
        );

        const batch = writeBatch(db);

        batch.delete(addressRef);

        // Assign a new default if addresses remain.
        if (remaining.length > 0) {
          batch.update(remaining[0].ref, {
            isDefault: true,
            updatedAt: serverTimestamp(),
          });
        }

        await batch.commit();
      } else {
        await deleteDoc(addressRef);
      }

      this.addressSuccess = 'Shipping address deleted successfully!';

      await this.loadAddresses();
    } catch (error) {
      console.error('Delete address error:', error);

      this.addressError = 'Unable to delete shipping address.';

      this.cdr.detectChanges();
    }
  }

  // =====================================
  // CLEANUP
  // =====================================

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
  }
}
