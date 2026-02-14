DECLARE
    email_exists EXCEPTION;
    PRAGMA EXCEPTION_INIT(email_exists, -1); 

    TYPE admin_details_t IS TABLE OF ADMINS%ROWTYPE INDEX BY PLS_INTEGER;
    admin_data admin_details_t;

BEGIN

    admin_data(1).name := 'admin1';
    admin_data(1).email := 'admin1@admin.com';
    admin_data(1).phone := '1234567890';
    admin_data(1).password := 'The password from generate_hashes.js (hashed password)';--admin1 the real password input of generate_hashes.js
    admin_data(1).role := 'admin';

    admin_data(2).name := 'admin2';
    admin_data(2).email := 'admin2@admin.com';
    admin_data(2).phone := '0987654321';
    admin_data(2).password := 'The password from generate_hashes.js'; --admin12
    admin_data(2).role := 'admin';

    admin_data(3).name := 'admin3';
    admin_data(3).email := 'admin3@example.com';
    admin_data(3).phone := '1112223333';
    admin_data(3).password := 'The password from generate_hashes.js'; --admin123
    admin_data(3).role := 'admin';

    FOR i IN 1..admin_data.COUNT LOOP
        BEGIN
            INSERT INTO admins (name, email, password, phone, role)
            VALUES (admin_data(i).name, admin_data(i).email, admin_data(i).password, admin_data(i).phone, admin_data(i).role);

            DBMS_OUTPUT.PUT_LINE('Admin ' || admin_data(i).name || ' created successfully.');
        EXCEPTION
            WHEN email_exists THEN
                DBMS_OUTPUT.PUT_LINE('Admin with email ' || admin_data(i).email || ' already exists. Skipping insertion.');
            WHEN OTHERS THEN
                DBMS_OUTPUT.PUT_LINE('An unexpected error occurred: ' || SQLERRM);
        END;
    END LOOP;

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Admin data committed.');
END;
/
