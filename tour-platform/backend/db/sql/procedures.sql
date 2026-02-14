DECLARE
    procedure_does_not_exist EXCEPTION;
    PRAGMA EXCEPTION_INIT(procedure_does_not_exist, -4043);

BEGIN
    BEGIN
        EXECUTE IMMEDIATE 'DROP PROCEDURE create_booking';
    EXCEPTION
        WHEN procedure_does_not_exist THEN NULL;
    END;

    BEGIN
        EXECUTE IMMEDIATE 'DROP PROCEDURE create_payment';
    EXCEPTION
        WHEN procedure_does_not_exist THEN NULL;
    END;

    BEGIN
        EXECUTE IMMEDIATE 'DROP PROCEDURE update_completed_bookings';
    EXCEPTION
        WHEN procedure_does_not_exist THEN NULL;
    END;

    EXECUTE IMMEDIATE '
    CREATE OR REPLACE PROCEDURE create_booking (
        p_user_id IN NUMBER,
        p_package_id IN NUMBER,
        p_booking_date IN TIMESTAMP,
        p_status IN VARCHAR2,
        p_starting_point IN VARCHAR2,
        p_tour_date IN DATE, -- <--- ADDED: Required by BOOKINGS table
        p_booking_id OUT NUMBER
    )
    AS
    BEGIN
        -- ADDED: TOUR_DATE to the column list and p_tour_date to the values list
        INSERT INTO bookings (user_id, package_id, booking_date, status, starting_point, tour_date)
        VALUES (p_user_id, p_package_id, p_booking_date, p_status, p_starting_point, p_tour_date)
        RETURNING booking_id INTO p_booking_id;
    END;
    ';

    DBMS_OUTPUT.PUT_LINE('Procedure create_booking created.');

    EXECUTE IMMEDIATE '
        CREATE OR REPLACE PROCEDURE create_payment (
            p_booking_id IN NUMBER,
            p_amount IN NUMBER,
            p_payment_date IN TIMESTAMP,
            p_payment_id OUT NUMBER
        )
        AS
        BEGIN
            INSERT INTO payments (booking_id, amount, payment_date)
            VALUES (p_booking_id, p_amount, p_payment_date)
            RETURNING payment_id INTO p_payment_id;
        END;
    ';
    DBMS_OUTPUT.PUT_LINE('Procedure create_payment created.');

    EXECUTE IMMEDIATE '
        CREATE OR REPLACE PROCEDURE update_completed_bookings
        AS
        BEGIN
            UPDATE bookings b
            SET b.status = ''Completed''
            WHERE b.status = ''Booked''
            AND b.package_id IN (
                SELECT package_id
                FROM tour_packages
                WHERE start_time < SYSDATE
            );
            COMMIT;
        END;
    ';
    DBMS_OUTPUT.PUT_LINE('Procedure update_completed_bookings created.');
    
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('An unexpected error occurred: ' || SQLERRM);
END;
/
