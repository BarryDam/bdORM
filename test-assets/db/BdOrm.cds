namespace bdOrm;

entity User {
    key id                        : Integer;
    firstname                     : String(50);     
    lastname                          : String(50);
    email                         : String(50);
    dateCreated                   : DateTime default $now;
    options                         : String(500);
    deleted                        : DateTime;
}

entity Post {
    key id                        : Integer;
    userId                        : Integer;
    title                        : String(50);
    content                      : String(50);
    dateCreated                   : DateTime default $now;
    deleted                        : DateTime;
}
