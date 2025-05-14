import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideToastr, ToastrService } from 'ngx-toastr';
import { errorInterceptor, STATUS } from './error-interceptor';

describe('ErrorInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  let router: Router;
  let toast: ToastrService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideToastr(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
    toast = TestBed.inject(ToastrService);
  });

  afterEach(() => httpMock.verify());

  it('should handle 200 OK without errors or toasts', () => {
    spyOn(toast, 'error');
    spyOn(router, 'navigateByUrl');

    let response: any;
    http.get('/user').subscribe({
      next: (res) => (response = res),
      error: () => fail('Should not emit error for 200 OK'),
    });

    httpMock.expectOne('/user').flush({ status: 'success', data: [] }, { status: 200, statusText: 'OK' });

    expect(response).toEqual({ status: 'success', data: [] });
    expect(toast.error).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('should handle 200 OK with error-like payload without errors or toasts', () => {
    spyOn(toast, 'error');
    spyOn(router, 'navigateByUrl');

    let response: any;
    http.get('/user').subscribe({
      next: (res) => (response = res),
      error: () => fail('Should not emit error for 200 OK'),
    });

    httpMock.expectOne('/user').flush({ status: 'error', message: 'Validation failed' }, { status: 200, statusText: 'OK' });

    expect(response).toEqual({ status: 'error', message: 'Validation failed' });
    expect(toast.error).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('should handle 401 with toast and navigation to login', () => {
    spyOn(toast, 'error');
    spyOn(router, 'navigateByUrl');

    http.get('/user').subscribe({
      error: () => {}, // Expect error due to throwError
    });

    httpMock.expectOne('/user').flush({ message: 'Invalid token' }, { status: 401, statusText: 'Unauthorized' });

    expect(toast.error).toHaveBeenCalledWith('Invalid token', 'Unauthorized');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
  });

  it('should handle 403 with navigation to /403', () => {
    spyOn(toast, 'error');
    spyOn(router, 'navigateByUrl');

    http.get('/user').subscribe({
      error: () => {}, // Expect error due to throwError
    });

    httpMock.expectOne('/user').flush({ msg: 'Access denied' }, { status: 403, statusText: 'Forbidden' });

    expect(toast.error).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/403', { skipLocationChange: true });
  });

  it('should handle 404 with navigation to /404', () => {
    spyOn(toast, 'error');
    spyOn(router, 'navigateByUrl');

    http.get('/user').subscribe({
      error: () => {}, // Expect error due to throwError
    });

    httpMock.expectOne('/user').flush({}, { status: 404, statusText: 'Not Found' });

    expect(toast.error).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/404', { skipLocationChange: true });
  });

  it('should handle 500 with navigation to /500', () => {
    spyOn(toast, 'error');
    spyOn(router, 'navigateByUrl');

    http.get('/user').subscribe({
      error: () => {}, // Expect error due to throwError
    });

    httpMock.expectOne('/user').flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });

    expect(toast.error).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/500', { skipLocationChange: true });
  });

  it('should handle other error status (e.g., 400) with toast', () => {
    spyOn(toast, 'error');
    spyOn(router, 'navigateByUrl');

    http.get('/user').subscribe({
      error: () => {}, // Expect error due to throwError
    });

    httpMock.expectOne('/user').flush({ message: 'Bad request' }, { status: 400, statusText: 'Bad Request' });

    expect(toast.error).toHaveBeenCalledWith('Bad request', 'Error');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('should propagate error via throwError', () => {
    let errorCaught: any;
    http.get('/user').subscribe({
      error: (err) => (errorCaught = err),
    });

    const errorResponse = { message: 'Bad request' };
    httpMock.expectOne('/user').flush(errorResponse, { status: 400, statusText: 'Bad Request' });

    expect(errorCaught).toBeInstanceOf(HttpErrorResponse);
    expect(errorCaught.status).toBe(400);
    expect(errorCaught.error).toEqual(errorResponse);
  });
});
