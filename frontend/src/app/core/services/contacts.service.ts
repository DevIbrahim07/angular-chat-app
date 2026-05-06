import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { Contact } from '../../models/contact.model';

@Injectable({
  providedIn: 'root',
})
export class ContactsService {
  private apiUrl = `${API_BASE_URL}/api/contacts`;

  constructor(private http: HttpClient) {}

  getContacts(): Observable<Contact[]> {
    return this.http.get<Contact[]>(this.apiUrl);
  }

  createContact(payload: {
    contactName: string;
    phoneNumber: string;
  }): Observable<{ message: string; contact: Contact }> {
    return this.http.post<{ message: string; contact: Contact }>(this.apiUrl, payload);
  }

  deleteContact(contactId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${contactId}`);
  }
}
