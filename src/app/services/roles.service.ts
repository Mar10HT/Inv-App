import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RoleSummary, RoleDetail, PermissionGroup, CreateRoleDto, UpdateRoleDto } from '../interfaces/role.interface';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/roles`;

  getAll(): Observable<RoleSummary[]> {
    return this.http.get<RoleSummary[]>(this.apiUrl);
  }

  getOne(id: string): Observable<RoleDetail> {
    return this.http.get<RoleDetail>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateRoleDto): Observable<RoleDetail> {
    return this.http.post<RoleDetail>(this.apiUrl, dto);
  }

  update(id: string, dto: UpdateRoleDto): Observable<RoleDetail> {
    return this.http.patch<RoleDetail>(`${this.apiUrl}/${id}`, dto);
  }

  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getPermissions(): Observable<PermissionGroup[]> {
    return this.http.get<PermissionGroup[]>(`${this.apiUrl}/permissions`);
  }
}
