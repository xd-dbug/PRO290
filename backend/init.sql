create table if not exists users(
    user_id char(36) not null default (UUID()),
    email varchar(100) unique not null,
    username varchar(100) unique not null,
    password_hash char(60) not null,
    created_at timestamp default current_timestamp(),
    primary key (user_id)

);