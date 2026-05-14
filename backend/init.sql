create table if not exists users (
    user_id       char(36)     not null default (UUID()),
    email         varchar(100) unique not null,
    username      varchar(100) unique not null,
    password_hash char(60)     not null,
    created_at    timestamp    default current_timestamp(),
    primary key (user_id)
);

create table if not exists notes (
    note_id    int          NOT NULL AUTO_INCREMENT,
    user_id    char(36)     NOT NULL,
    title      varchar(100) NOT NULL,
    body       varchar(255) NOT NULL,
    created_at timestamp    default current_timestamp(),
    updated_at timestamp    default current_timestamp() on update current_timestamp(),
    primary key (note_id),
    foreign key (user_id) references users(user_id) on delete cascade
);